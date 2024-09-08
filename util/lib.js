module.exports = {
  modelCall: async (func, ...args) => {
    try {
      return await func(...args);
    } catch (error) {
      console.error(error);
    }
  },

  deepCopy(obj) {
    if (obj === null || typeof obj !== "object") {
      return obj; // string number
    }
    const result = Array.isArray(obj) ? [] : {};
    for (const key of Object.keys(obj)) {
      result[key] = lib.deepCopy(obj[key]);
    }
    return result;
  },
};
