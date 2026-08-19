import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

interface BlockItem {
    key: string;
    name: string;
    order: number;
    type?: string;
    imageUrl?: string;
    height?: string | number;
    title?: string;
    logoUrl?: string;
    logoWidth?: number;
    logoHeight?: number;
    text?: string;
    vi?: string;
    en?: string;
    titleColor?: string;
    textColor?: string;
    logo?: string;
    menu?: Array<{
        label: string;
        href: string;
    }>;
    src?: string;
    width?: number;
    left?: string;
    right?: string;
    split?: string;
    desc?: string;
    childComponent?: string;
    content?: string;
    [key: string]: any;
}

@Entity('blocks')
@Index(['pageId']) // Tối ưu query lấy blocks theo trang
export class Block {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ type: 'nvarchar', length: 255, unique: true })
    pageId: string; // Ví dụ: "about", "home", "contact"

    @Column({ type: 'nvarchar', length: 'MAX' })
    blocks: string; // JSON array chứa tất cả block data

    @Column({ type: 'bit', default: false, nullable: true })
    replaceAll?: boolean; // Flag nếu cần replace toàn bộ blocks cũ

    @Column({ type: 'int', default: 1 })
    status: number; // 1: active, 0: inactive

    @CreateDateColumn({ type: 'datetime' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'datetime' })
    updatedAt: Date;

    // Helper method để parse JSON blocks
    getBlocksData(): BlockItem[] {
        try {
            return JSON.parse(this.blocks);
        } catch (e) {
            return [];
        }
    }

    // Helper method để set blocks từ array
    setBlocksData(data: BlockItem[]): void {
        this.blocks = JSON.stringify(data);
    }
}