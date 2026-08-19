export function getResult(data, target) {
  const targetFinal = target.split(".");
  const result = targetFinal.reduce(
    (acc, val) => (acc ? acc[val] : null),
    data
  );
  return result;
}
