module.exports = {
  QuestionAgent: require("./questionAgent.js")(),
  DBAgent: require("./dbAgent.js")(),
  RecomAgent: require("./recomAgent.js")(),
  //SearchAgent: require("./searchAgent.js")(),
  SeperateAgent: require("./seperateAgent.js")(),
  SummarizeAgent: require("./summarizeAgent.js")(),
};