export const parseTimeToMinutes = (value, unit) => {
    const val = parseFloat(value) || 0;
    switch (unit?.toLowerCase()) {
        case "ngày":
            return val * 24 * 60;
        case "giờ":
            return val * 60;
        case "phút":
            return val;
        default:
            return val * 24 * 60; // Mặc định là ngày như trong UI
    }
};

export const formatMinutesToText = (totalMinutes) => {
    if (!totalMinutes || totalMinutes <= 0) return "0 phút";
    
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = Math.floor(totalMinutes % 60);
    
    let result = [];
    if (days > 0) result.push(`${days} ngày`);
    if (hours > 0) result.push(`${hours} giờ`);
    if (minutes > 0) result.push(`${minutes} phút`);
    
    return result.join(" ");
};

export const calculateOwnNodeDuration = (node) => {
    return parseTimeToMinutes(node.executionTime, node.unit);
};

export const calculateNodeDuration = (node) => {
    // Nếu node có công việc con, thời gian của nó được tính dựa trên các con (có tính đến phụ thuộc)
    if (node.children && node.children.length > 0) {
        return calculateSiblingsDuration(node.children);
    }
    // Nếu là công việc lá, lấy thời gian thực hiện của chính nó
    return parseTimeToMinutes(node.executionTime, node.unit);
};

export const calculateSiblingsDuration = (siblings) => {
    if (!siblings || siblings.length === 0) return 0;

    // Chuẩn bị dữ liệu node với logic: Nếu không có dependency, mặc định phụ thuộc vào node trước đó (tuần tự)
    const nodeData = siblings.map((node, index) => {
        const id = node.id || node._id || node.tempId || `node_${index}`;
        const prevId = index > 0 ? (siblings[index - 1].id || siblings[index - 1]._id || siblings[index - 1].tempId || `node_${index - 1}`) : null;
        
        return {
            id,
            title: node.title || node.name,
            duration: calculateNodeDuration(node),
            // Ưu tiên dependency người dùng chọn, nếu không có thì lấy node ngay trước đó
            dependsOn: node.dependency || prevId
        };
    });

    const finishTimes = {};
    let changed = true;
    let iterations = 0;
    const maxIterations = nodeData.length * 2;

    while (changed && iterations < maxIterations) {
        changed = false;
        iterations++;

        nodeData.forEach(node => {
            if (finishTimes[node.id] !== undefined) return;

            let startTime = 0;
            if (node.dependsOn) {
                // Tìm node phụ thuộc (theo ID hoặc theo Title nếu ID không khớp)
                const dependency = nodeData.find(n => n.id === node.dependsOn || (n.title && n.title === node.dependsOn));
                if (dependency) {
                    if (finishTimes[dependency.id] !== undefined) {
                        startTime = finishTimes[dependency.id];
                    } else {
                        // Chưa tính được dependency, đợi vòng sau
                        return;
                    }
                }
            }

            finishTimes[node.id] = startTime + node.duration;
            changed = true;
        });
    }

    // Gán thời gian cơ sở cho các node không thể tính toán (vòng lặp hoặc mất link)
    nodeData.forEach(node => {
        if (finishTimes[node.id] === undefined) {
            finishTimes[node.id] = node.duration;
        }
    });

    const maxFinishTime = Math.max(...Object.values(finishTimes), 0);
    return maxFinishTime;
};

export const flattenTree = (nodes, parentId = null) => {
    let result = [];
    if (!nodes || !Array.isArray(nodes)) return result;
    nodes.forEach(node => {
        // eslint-disable-next-line camelcase
        const nodeWithParent = { ...node,   parentId };
        result.push(nodeWithParent);
        if (node.children && node.children.length > 0) {
            const nodeId = node.id || node._id;
            result = result.concat(flattenTree(node.children, nodeId));
        }
    });
    return result;
};

export const syncAllDurations = (nodes) => {
    if (!nodes || !Array.isArray(nodes)) return nodes;
    
    return nodes.map(node => {
        let updatedNode = { ...node };
        if (node.children && node.children.length > 0) {
            // Đệ quy cập nhật các tầng dưới trước (bottom-up)
            updatedNode.children = syncAllDurations(updatedNode.children);
            
            // Tính tổng thời gian của tầng con có tính đến phụ thuộc
            const totalMinutes = calculateSiblingsDuration(updatedNode.children);
            
            // Cập nhật executionTime của cha dựa trên tổng thời gian của con
            const parentUnit = updatedNode.unit || "ngày";
            let convertedTime;
            
            if (parentUnit === "giờ") {
                convertedTime = totalMinutes / 60;
            } else if (parentUnit === "phút") {
                convertedTime = totalMinutes;
            } else {
                convertedTime = totalMinutes / (24 * 60);
            }
            
            // Cập nhật giá trị hiển thị, làm tròn 2 chữ số thập phân
            updatedNode.executionTime = String(Number(convertedTime.toFixed(2)));
        }
        return updatedNode;
    });
};
