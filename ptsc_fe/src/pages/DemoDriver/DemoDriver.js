import Driver from "@components/Driver";
import React from "react";

function DemoDriver() {
  const onOpen = (item) => {
    logger.log("Open item:", item);
  };
  return (
    <div style={{ height: "100%" }}>
      <Driver onOpen={onOpen} />
    </div>
  );
}

export default DemoDriver;
