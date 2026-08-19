# TAI LIEU TRIEN KHAI NOI BO
## Cau hinh BPMN Extension cho module Van ban den / Van ban di

## 1. Muc dich
Tai lieu nay mo ta day du cac thuoc tinh extension BPMN dang duoc doc va thuc thi trong he thong cho 2 module:
- Van ban den (IncommingDocument)
- Van ban di (OutgoingDocument)

Muc tieu:
- Chuan hoa cach cau hinh flow/node/lane trong BPMN.
- Lam ro thu tu uu tien va tac dong cua tung extension den availableActions, xu ly runtime, work item, audit, status.
- Ho tro trien khai, debug va nghiem thu (UAT) nhat quan.

## 2. Pham vi
### 2.1 File da ra soat
- src/bpmn/bpmn-engine.service.ts
- src/bpmn/runtime-dbmssql.service.ts
- src/work-items/work-items.service.ts
- src/outgoing-documents/outgoing-documents.service.ts
- src/task/task.service.ts (co lien quan mot so extension flow duoc dung bo sung)
- src/utils/util.ts
- src/variable/action-catalog.ts

### 2.2 Nguyen tac ra soat
- Chi liet ke extension co dau hieu duoc doc/thuc thi trong code runtime hien tai.
- Phan biet ro:
  - Dang su dung (active)
  - Co parse nhung chua thay logic su dung ro rang trong module VB den/VB di (reserved/legacy)

## 3. Kien truc xu ly extension
### 3.1 Lop WorkItemsService (entrypoint API)
- Nhan request xu ly cong viec (complete, return, processDocument, setProcessor, signDoc, promulgateDocument...).
- Goi runtime tuong ung trong RuntimeDbService.

### 3.2 Lop RuntimeDbService (orchestration xu ly nghiep vu)
- Parse BPMN XML -> model indexes.
- Chon flow theo actionCode.
- Doc extension cua flow/node/lane.
- Tao/xoa work item, ghi audit, cap nhat status, xu ly notification.

### 3.3 Lop BpmnEngineService (engine tinh action)
- buildIndexes: map node/flow/lane/role.
- computeAvailableActions: tinh danh sach hanh dong kha dung theo extension.
- processFlowAction: ap extension de xac dinh targetRole, flags, assignee requirement, signKey.

## 4. Bang thuoc tinh extension

### 4.1 Flow extension (camunda:properties tren SequenceFlow)
| Thuoc tinh | Kieu du lieu | Vi du | Ap dung | Trang thai | Cong dung |
|---|---|---|---|---|---|
| actionCode | string | CHUYEN_XU_LY, TRA_LAI, TRINH_KY | VB den + VB di | Active | Ma hanh dong nghiep vu. Uu tien cao nhat khi map action (neu khong co thi fallback theo ten flow/id). |
| actionType | string | transfer, return, signingSubmission, addProcess | VB den + VB di | Active | Override type trong action-catalog. Anh huong direct luong xu ly runtime va gom nhom action. |
| actionSecType | string | transferSupport (vi du) | Chu yeu engine action | Active | Dat secType phu cho UI/logic ve sau. |
| actionGroup | string | CHUYEN_XU_LY_GROUP | VB den + VB di | Active | Gom nhieu action cung nhom thanh 1 nut tong hop. |
| groupLabel | string | Chuyen xu ly | VB den + VB di | Active | Nhan hien thi cho action group. |
| actionLabel | string | Trinh lanh dao | VB den + VB di | Active | Override label hien thi cua action/subAction. |
| selectionMode | single/multi | single | VB den + VB di | Active | Quy dinh cach chon nguoi don/da nguoi. |
| flags | csv key:value hoac key | canSuggestion:true,transfer:toComplete | VB den + VB di | Active | Truyen co dong cho runtime. Duoc parse boi parseFlagsButton trong nhieu luong xu ly. |
| flagsButton | csv key:value hoac key | priority:true,isConcurrent:true | VB den + VB di | Active | Co UI/logic bo sung: priority, isConcurrent, addProcess, ... |
| ROLE_XIN_Y_KIEN | csv role code | PHONG_PHAP_CHE,LANH_DAO | Chu yeu VB den | Active | Cau hinh danh sach role xin y kien o cap flow (uu tien cao). |
| flagInTask | string true/false | true | Dung bo sung trong TaskService | Active (ngoai module VB den/di core) | Dieu kien an/hien actions theo logic task. |
| flagNotNextNode | string true/false | true | Dung bo sung trong TaskService | Active (ngoai module VB den/di core) | Neu true thi tinh next node theo nextInteractiveFromFlow thay vi findNextGatewayFromFlow. |
| flagGctGph | string true/false | true | Dung bo sung trong TaskService | Active (ngoai module VB den/di core) | Tach luong giao cong tac chu tri/phoi hop cho TaskManyLevelUnit. |

Ghi chu:
- flags dang duoc dung cho ca logic nghiep vu (vd canSuggestion, transfer=toComplete) va logic UI/cho phep thao tac.
- Trong runtime co truong hop parse nham flowExtProps.flags vao bien flagsButton (thuc te van dung duoc do parseFlagsButton la parser chung).

### 4.2 Node extension (camunda:properties tren node dich/nguon)
| Thuoc tinh | Kieu du lieu | Vi du | Ap dung | Trang thai | Cong dung |
|---|---|---|---|---|---|
| statusCode | string | CHO_XU_LY, DA_XU_LY, CHO_KY_BAN_HANH | VB den + VB di | Active (quan trong) | Ma trang thai nghiep vu de cap nhat document/audit theo node dich. |
| allowSendToUnit | true/false string | true | Chu yeu VB di -> ban hanh/noi bo | Active | Mo cho phep chuyen theo don vi (room/unit), dong thoi tac dong validate truoc ban hanh va canTransferRoom. |
| signerRequired | string | signContentDraft, signFormatDraft, reportSigner, signStamp | Chu yeu VB di | Active | Xac dinh loai nguoi ky va stage status ky tiep theo. |
| keySign | string map | default:./.,1://,location:content-1 | VB di ky so | Active | Cau hinh keyword/vi tri ky theo thu tu ky. Duoc parse tai parseKeySign. |
| signaturePlacement | string | bottom-right | VB di ky so | Active | Cau hinh vi tri dat chu ky. |
| isBackground | true/false string | true | VB di ky so | Active | Co thong tin bo sung cho xu ly ky/hien thi. |
| giveNumber | true/false | true | VB di | Active | Bat buoc xu ly cho so/van thu theo quy tac role. |
| sendToAllEmployees | true/false | true | Chu yeu processDocumentv2 | Active | Bat che do phan cong dong den nhieu nhanh theo role user. |
| isRoom | true/false | true | VB den | Active | Danh dau node theo don vi/phong trong khoi tao du lieu node. |
| NEWS | true/false | true | Nhanh News workflow | Active (ngoai scope chinh VB den/di) | Bat logic co rieng cho tin tuc. |
| assignmentAll | true/false | true | Nhanh phan cong gateway | Active | Dieu khien loc nhanh theo role hay assignment day du. |
| actionCode (tren ServiceTask/node) | string | BAN_HANH | Active mot so luong ServiceTask | Active | Override action khi node service can dong bo ma hanh dong. |
| sendTopOr | true/false | true | VB di ky | Active (dac thu) | Co thong tin bo sung trong luong signDoc. |
| typeSign | string | ... | VB di ky | Active (dac thu) | Co thong tin bo sung de quyet dinh stage ky. |
| statusDoc | string | ... | Co xuat hien cuc bo | Reserved/Can review | Co noi dung su dung statusDoc thay vi statusCode o mot vai diem, can thong nhat de tranh sai map. |

### 4.3 Lane extension (camunda:properties tren lane)
| Thuoc tinh | Kieu du lieu | Vi du | Ap dung | Trang thai | Cong dung |
|---|---|---|---|---|---|
| candidateGroups | string role code | VAN_THU_CUC | VB den + VB di | Active (bat buoc) | Role chinh de map lane -> node -> targetRole. |
| flags | csv key:value hoac key | reqSignFormatDraft:true | VB den + VB di | Active | Co lane duoc dung nhu policy: vi du bat buoc co nguoi ky the thuc truoc buoc tiep. |
| ROLE_XIN_Y_KIEN | csv role code | PHONG_A,PHONG_B | Chu yeu VB den | Active | Fallback danh sach role xin y kien o cap lane. |

## 5. Thu tu uu tien khi resolve extension
### 5.1 Uu tien action metadata
1. Flow.actionCode
2. Ten flow (name) -> uppercase
3. Flow.id
4. action-catalog map type/label/selectionMode
5. Override boi actionType/actionSecType/selectionMode/actionLabel/groupLabel

### 5.2 Uu tien role xin y kien
1. ROLE_XIN_Y_KIEN tren node truoc (incoming source)
2. ROLE_XIN_Y_KIEN tren flow
3. ROLE_XIN_Y_KIEN tren lane hien tai

### 5.3 Uu tien trang thai
1. statusCode tren node dich/flow target hop le
2. Fallback theo context runtime (mot so luong co logic chon node ket thuc/next node)

## 6. Sequence xu ly

### 6.1 Sequence A - Lay available actions (UI/permission)
1. WorkItems/Runtime lay model BPMN va work item hien tai.
2. BpmnEngine.buildIndexes map nodes/outgoing/laneMap.
3. BpmnEngine.computeAvailableActions:
   - Doc extension node hien tai + flow outgoing.
   - Phan nhanh theo loai gateway/service task/normal flow.
   - Ap actionCode/actionType/selectionMode/group/flags.
   - Tinh targetRole, requiresAssignee, canTransferRoom.
   - Gom nhom actions theo actionGroup/type.
4. Runtime tong hop flags + actions tra ve FE.

Ket qua tra ve:
- availableActions
- flags dong theo extension
- signKey (neu co keySign/signerRequired)

### 6.2 Sequence B - Xu ly Van ban den (complete/return/process)
1. WorkItemsService.complete/return/processDocument goi RuntimeDbService.
2. Runtime tim flow theo actionCode.
3. Doc flow extension:
   - flags/flagsButton de xac dinh branch dac thu (vd CHUYEN_TUY_CHON).
   - actionType/actionGroup de xu ly cach tao audit/workitem.
4. Doc node extension dich:
   - statusCode de update trang thai document.
   - cac co dac thu khac neu co.
5. Ghi audit + tao/xoa workitems + update status + comment system + notification.

### 6.3 Sequence C - Xu ly Van ban di (setProcessor/signDoc/promulgate)
1. setProcessor/signDoc/promulgate vao Runtime.
2. Runtime resolve nextNode/targetRole tu flow + extension.
3. Node extension chi phoi manh:
   - signerRequired -> stage cho ky noi dung/the thuc/ban hanh/dong dau
   - keySign/signaturePlacement/isBackground -> tham so ky
   - giveNumber -> rang buoc van thu cho so
   - allowSendToUnit -> quy tac ban hanh/chuyen ve don vi
4. Ket qua:
   - Cap nhat outgoing doc status
   - Tao incoming copy (neu ban hanh)
   - Tao notification/email theo receiver processor/unit

## 7. Mapping extension -> module Van ban den / Van ban di
### 7.1 Van ban den su dung manh
- actionCode, actionType, actionGroup, selectionMode
- flags, flagsButton
- statusCode
- ROLE_XIN_Y_KIEN
- candidateGroups

### 7.2 Van ban di su dung manh
- actionCode, actionType, flagsButton
- signerRequired, keySign, signaturePlacement, isBackground
- giveNumber
- allowSendToUnit
- statusCode
- candidateGroups

## 8. Thuoc tinh parse nhung can danh dau review
- flagInTask, flagNotNextNode, flagGctGph:
  - Dang duoc parse trong BpmnEngine.
  - Dang su dung ro rang o TaskService.
  - Khong phai truc tiep core flow VB den/VB di trong RuntimeDbService, nhung co the anh huong man tong hop task.
- statusDoc:
  - Co xuat hien o mot vai vi tri thay cho statusCode.
  - De xuat thong nhat dung statusCode de giam sai khac cau hinh.

## 9. Mau cau hinh khuyen nghi
### 9.1 Mau Flow extension
- actionCode: CHUYEN_XU_LY
- actionType: transfer
- selectionMode: single
- actionGroup: CHUYEN_XU_LY_GROUP
- groupLabel: Chuyen xu ly
- flagsButton: priority:true,isConcurrent:false

### 9.2 Mau Node extension (ky so)
- statusCode: CHO_KY_NOI_DUNG
- signerRequired: signContentDraft
- keySign: default:./.,1://,2:/./,location:content-1
- signaturePlacement: bottom-right
- isBackground: false

### 9.3 Mau Node extension (ban hanh)
- statusCode: DA_BAN_HANH
- allowSendToUnit: true

### 9.4 Mau Lane extension
- candidateGroups: VAN_THU_CUC
- flags: reqSignFormatDraft:true
- ROLE_XIN_Y_KIEN: PHONG_PHAP_CHE,LANH_DAO

## 10. Checklist UAT/Trien khai
1. Moi lane co candidateGroups hop le va map duoc users trong flow.
2. Moi flow co actionCode duy nhat trong cung node outgoing.
3. Cac flow co actionType return/transfer/signingSubmission duoc test du cac nhanh.
4. Neu dung ky so: signerRequired + keySign + signaturePlacement phai day du.
5. Neu dung ban hanh ve don vi: allowSendToUnit + logic cho so da dat.
6. Kiem tra flags/flagsButton khong conflict giua flow va lane.
7. Kiem tra nhung thuoc tinh reserved (statusDoc, flagInTask...) truoc khi dua vao quy trinh VB den/VB di moi.

## 11. Tham chieu nhanh (code)
- BpmnEngine:
  - getFlowExtensionProperties
  - buildIndexes
  - computeAvailableActions
  - processFlowAction
- RuntimeDbService:
  - completeWorkItem, returnWorkItem, returnWorkItemOutgoing
  - processDocumentv2
  - setProcessor, signDoc, promulgateDocument
- WorkItemsService:
  - complete, return, processDocument, setProcessor, signDoc, promulgateDocument

(Neu can ban phu luc XML mau theo tung use-case: Chuyen xu ly, Xin y kien, Trinh ky, Ban hanh, co the bo sung them tai lieu Appendix rieng.)
