const fs = require('fs');
const path = require('path');

const bpmnPath = path.join(__dirname, '..', 'phucdapnew.bpmn');
let content = fs.readFileSync(bpmnPath, 'utf8');

// Replace line 354 target content
content = content.replace(
  'value="addProcess: addProcess,isDirect: false,onlyUsers :  true"',
  'value="addProcess: addProcess,isDirect: false,onlyUsers :  true,forceCloseWorkItem: true"'
);

// We need to be careful with line 884 and 929 since they are identical to some other lines (value="addProcess: addProcess").
// Let's do a more robust XML parsing/regex or specific replacements contextually.

// For Flow_02vkkbe (line 875):
// <bpmn:sequenceFlow id="Flow_02vkkbe" name="CHUYEN_XU_LY" sourceRef="Gateway_1f9vr7j" targetRef="Activity_0xvdk0g">
// ...
// <camunda:property name="flagsButton" value="addProcess: addProcess" />
// We can match the entire block for Flow_02vkkbe:
const flow02vkkbeRegex = /(<bpmn:sequenceFlow id="Flow_02vkkbe"[\s\S]*?<camunda:property name="flagsButton" value=")addProcess: addProcess(" \/>)/;
content = content.replace(flow02vkkbeRegex, '$1addProcess: addProcess,forceCloseWorkItem: true$2');

// For Flow_1oq6zw9 (line 919):
// <bpmn:sequenceFlow id="Flow_1oq6zw9" sourceRef="Gateway_0p7s0q7" targetRef="Activity_0xvdk0g">
// ...
// <camunda:property name="flagsButton" value="addProcess: addProcess" />
const flow1oq6zw9Regex = /(<bpmn:sequenceFlow id="Flow_1oq6zw9"[\s\S]*?<camunda:property name="flagsButton" value=")addProcess: addProcess(" \/>)/;
content = content.replace(flow1oq6zw9Regex, '$1addProcess: addProcess,forceCloseWorkItem: true$2');

fs.writeFileSync(bpmnPath, content, 'utf8');
console.log('Successfully updated phucdapnew.bpmn!');
