const Question = require('./Question');
const Recommendation = require('./Recommendation');

class Message {
    constructor(data) {
        if (data != null) {
            this._id = data._id;
            this.type = data.type;
            this.groupid = data.groupid;
            this.content = data.content;
            this.intent = data.intent || "";
            this.entities = data.entities || [];
            this.includeInContext = data.includeInContext !== undefined ? data.includeInContext : true;
            this.productionQuestions = (data.productionQuestions || []).map(msg => new Question(msg));
            this.servicesQuestions = (data.servicesQuestions || []).map(msg => new Question(msg));
            this.search_context = data.search_context || [];
            this.recommendations = (data.recommendations || []).map(msg => new Recommendation(msg));
            this.action = ""; // ✅ Yeni action alanı eklendi
            this.createdAt = data.createdAt;
            this.updatedAt = data.updatedAt;
        }
    }

    // Getters
    getId() {
        return this._id;
    }

    getType() {
        return this.type;
    }

    getGroupId() {
        return this.groupid;
    }

    getContent() {
        return this.content;
    }

    getIntent() {
        return this.intent;
    }

    getEntities() {
        return this.entities;
    }

    isIncludeInContext() {
        return this.includeInContext;
    }

    getProductionQuestions() {
        return this.productionQuestions.map(item => new Question(item));
    }

    getServicesQuestions() {
        return this.servicesQuestions.map(item => new Question(item));
    }

    getSearchContext() {
        return this.search_context;
    }

    getSystemData() {
        return this.systemData;
    }

    getCreatedAt() {
        return this.createdAt;
    }

    getUpdatedAt() {
        return this.updatedAt;
    }

    // Setters
    setType(type) {
        this.type = type;
    }

    setGroupId(groupid) {
        this.groupid = groupid;
    }

    setContent(content) {
        this.content = content;
    }

    setIntent(intent) {
        this.intent = intent;
    }

    setEntities(entities) {
        this.entities = entities;
    }

    setIncludeInContext(includeInContext) {
        this.includeInContext = includeInContext;
    }

    setProductionQuestions(productionQuestions) {
        this.productionQuestions = productionQuestions;
    }
    setRecommendations(recommendations) {
        this.recommendations = recommendations;
    }
    setServicesQuestions(servicesQuestions) {
        this.servicesQuestions = servicesQuestions;
    }

    setSearchContext(search_context) {
        this.search_context = search_context;
    }

    setSystemData(systemData) {
        this.systemData = systemData;
    }

    setAction(action) { // ✅ Yeni setter metodu
        this.action = action;
    }


}

module.exports = Message;