const sql = require('mssql');
const fs = require('fs');
const path = require('path');

// Cấu hình lưu trữ
const BACKUP_DIR = path.join(__dirname, '../backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}
require('dotenv').config();

const config = {
  server: process.env.SQLSERVER_HOST || 'localhost',
  port: parseInt(process.env.SQLSERVER_PORT) || 1433,
  user: process.env.SQLSERVER_USER || 'lifetex',
  password: process.env.SQLSERVER_PASSWORD || 'LTLT@2025',
  database: process.env.SQLSERVER_DATABASE || 'app_tancang',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

async function backupMeeting() {
  const meetingId = process.argv[2];
  if (!meetingId) {
    console.error('❌ Vui lòng cung cấp meeting_id (uuid). Ví dụ: node scripts/backup-meeting.js 3fa85f64-5717-4562-b3fc-2c963f66afa6');
    process.exit(1);
  }

  let pool;
  try {
    console.log(`🔌 Đang kết nối đến SQL Server...`);
    pool = await sql.connect(config);
    console.log('✅ Đã kết nối thành công!');

    const backupData = {
      meeting_id: meetingId,
      backup_at: new Date().toISOString(),
      tables: {}
    };

    // 1. Check & backup meetings table
    console.log(`⏳ Đang lấy dữ liệu từ bảng meetings...`);
    const meetingResult = await pool.request()
      .input('meetingId', sql.VarChar, meetingId)
      .query(`SELECT * FROM meetings WHERE id = @meetingId`);

    if (meetingResult.recordset.length === 0) {
      console.error(`❌ Không tìm thấy cuộc họp với ID: ${meetingId}`);
      process.exit(1);
    }
    backupData.tables['meetings'] = meetingResult.recordset;

    // Danh sách các bảng liên kết trực tiếp bằng meeting_id
    const directTables = [
      { name: 'online_meetings', column: 'meeting_id' },
      { name: 'meeting_recurrences', column: 'meeting_id' },
      { name: 'meeting_units', column: 'meeting_id' },
      { name: 'meeting_guests', column: 'meeting_id' },
      { name: 'meeting_tasks', column: 'meeting_id' },
      { name: 'work_items', column: 'document_id' },
      { name: 'audit', column: 'document_id' }
    ];

    for (const table of directTables) {
      try {
        console.log(`⏳ Đang lấy dữ liệu từ bảng ${table.name}...`);
        const result = await pool.request()
          .input('meetingId', sql.VarChar, meetingId)
          .query(`SELECT * FROM ${table.name} WHERE ${table.column} = @meetingId`);
        
        backupData.tables[table.name] = result.recordset;
        console.log(`✅ Đã lấy ${result.recordset.length} bản ghi từ ${table.name}`);
      } catch (err) {
        console.warn(`⚠️ Lỗi khi lấy dữ liệu từ bảng ${table.name}:`, err.message);
      }
    }

    // Lấy dữ liệu liên kết gián tiếp qua meeting_units
    const meetingUnits = backupData.tables['meeting_units'] || [];
    const unitIds = meetingUnits.map(u => u.id).filter(Boolean);

    if (unitIds.length > 0) {
      const formattedUnitIds = unitIds.map(id => `'${id}'`).join(',');
      
      // meeting_unit_seats
      try {
        console.log(`⏳ Đang lấy dữ liệu từ bảng meeting_unit_seats...`);
        const seatsResult = await pool.request()
          .query(`SELECT * FROM meeting_unit_seats WHERE meeting_unit_id IN (${formattedUnitIds})`);
        backupData.tables['meeting_unit_seats'] = seatsResult.recordset;
        console.log(`✅ Đã lấy ${seatsResult.recordset.length} bản ghi từ meeting_unit_seats`);
      } catch (err) {
        console.warn(`⚠️ Lỗi khi lấy dữ liệu từ bảng meeting_unit_seats:`, err.message);
      }

      // meeting_participants
      try {
        console.log(`⏳ Đang lấy dữ liệu từ bảng meeting_participants...`);
        const participantsResult = await pool.request()
          .query(`SELECT * FROM meeting_participants WHERE meeting_unit_id IN (${formattedUnitIds})`);
        backupData.tables['meeting_participants'] = participantsResult.recordset;
        console.log(`✅ Đã lấy ${participantsResult.recordset.length} bản ghi từ meeting_participants`);
      } catch (err) {
        console.warn(`⚠️ Lỗi khi lấy dữ liệu từ bảng meeting_participants:`, err.message);
      }
    } else {
      backupData.tables['meeting_unit_seats'] = [];
      backupData.tables['meeting_participants'] = [];
    }

    // Thu thập file_relations
    backupData.tables['file_relations'] = [];
    
    // File của chính cuộc họp (audioMeeting, ConclusionMeeting)
    try {
      console.log(`⏳ Đang lấy file_relations của cuộc họp (Conclusion/Audio)...`);
      const directFilesResult = await pool.request()
        .input('meetingId', sql.VarChar, meetingId)
        .query(`SELECT * FROM file_relations WHERE object_id = @meetingId AND object_type IN ('ConclusionMeeting', 'audioMeeting')`);
      
      backupData.tables['file_relations'].push(...directFilesResult.recordset);
    } catch (err) {
      console.warn(`⚠️ Lỗi khi lấy file_relations trực tiếp:`, err.message);
    }

    // File của các task trong cuộc họp (MeetingTask)
    const meetingTasks = backupData.tables['meeting_tasks'] || [];
    const taskIds = meetingTasks.map(t => t.id).filter(Boolean);
    if (taskIds.length > 0) {
      try {
        console.log(`⏳ Đang lấy file_relations của các công việc (MeetingTask)...`);
        const formattedTaskIds = taskIds.map(id => `'${id}'`).join(',');
        const taskFilesResult = await pool.request()
          .query(`SELECT * FROM file_relations WHERE object_id IN (${formattedTaskIds}) AND object_type = 'MeetingTask'`);
        
        backupData.tables['file_relations'].push(...taskFilesResult.recordset);
      } catch (err) {
        console.warn(`⚠️ Lỗi khi lấy file_relations của các công việc:`, err.message);
      }
    }

    console.log(`✅ Tổng cộng thu thập được ${backupData.tables['file_relations'].length} file_relations`);

    // Lấy thông tin chi tiết bảng files
    const fileRelations = backupData.tables['file_relations'];
    if (fileRelations && fileRelations.length > 0) {
      const fileIds = [...new Set(fileRelations.map(fr => fr.file_id).filter(Boolean))];
      if (fileIds.length > 0) {
        console.log(`⏳ Đang lấy dữ liệu từ bảng files...`);
        const result = await pool.request()
          .query(`SELECT * FROM files WHERE id IN (${fileIds.join(',')})`);
        
        backupData.tables['files'] = result.recordset;
        console.log(`✅ Đã lấy ${result.recordset.length} bản ghi từ files`);
      } else {
        backupData.tables['files'] = [];
      }
    } else {
      backupData.tables['files'] = [];
    }

    const fileName = `backup_meeting_${meetingId}.json`;
    const filePath = path.join(BACKUP_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8');

    console.log('\n============================================');
    console.log(`✅ Sao lưu cuộc họp hoàn tất!`);
    console.log(`📂 File: ${filePath}`);
    console.log('============================================');

  } catch (error) {
    console.error('❌ Lỗi khi sao lưu cuộc họp:', error.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Đã đóng kết nối');
    }
  }
}

backupMeeting();
