const ProductDetailTool  = require("./ProductDetailTool");
const QuestionTool       = require("./QuestionTool");
const ProductSuggestTool = require("./ProductSuggestTool");

module.exports = {
  ProductDetailTool : new ProductDetailTool(),   // ⬅️  burada new
  QuestionTool      : new QuestionTool(),
  ProductSuggestTool: new ProductSuggestTool(),
  // …diğer tool’lar aynı şekilde
};