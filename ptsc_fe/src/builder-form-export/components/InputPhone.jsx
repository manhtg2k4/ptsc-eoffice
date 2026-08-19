import React from "react";
import { predefinedFields } from "@builder-form-export/utils/fieldList";

export default function InputPhone({ item, onPropChange, mode = "builder" }) {
  logger.log("mode", mode);
  const selectedField = predefinedFields.find(
    (f) => f.name === item.props?.fieldName
  );

  const handleSelect = (e) => {
    const fieldName = e.target.value;
    const selected = predefinedFields.find((f) => f.name === fieldName);
    if (selected) {
      onPropChange(item.id, "fieldName", selected.name);
      onPropChange(item.id, "label", selected.label);
      onPropChange(item.id, "required", selected.required || false);
      onPropChange(item.id, "maxLength", selected.maxLength || undefined);
    }
  };

  if (!selectedField) {
    return (
      <div className="form-element">
        {mode === "builder" && (
          <>
            <label>Chọn trường:</label>
            <select onChange={handleSelect} value={item.props?.fieldName || ""}>
              <option value="">-- Chọn --</option>
              {predefinedFields.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.label}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="form-element">
      {mode === "builder" && (
        <>
          <label>Chọn trường:</label>
          <select onChange={handleSelect} value={item.props?.fieldName || ""}>
            <option value="">-- Chọn --</option>
            {predefinedFields.map((f) => (
              <option key={f.name} value={f.name}>
                {f.label}
              </option>
            ))}
          </select>
        </>
      )}
      <label>{selectedField.label}</label>
      <input
        type="text"
        name={selectedField.name}
        placeholder={selectedField.label}
        required={selectedField.required}
        maxLength={selectedField.maxLength || undefined}
      />
    </div>
  );
}
