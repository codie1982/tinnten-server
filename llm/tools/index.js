const {ProductSearchTool}  = require("./ProductSearchTool");
const {OfferSearchTool}  = require("./OfferSearchTool");
const QuestionTool       = require("./QuestionTool");
const ProductSuggestTool = require("./ProductSuggestTool");

module.exports = {
  ProductSearchTool : new ProductSearchTool(),   // ⬅️  burada new
  OfferSearchTool : new OfferSearchTool(),   // ⬅️  burada new
  // …diğer tool’lar aynı şekilde
};