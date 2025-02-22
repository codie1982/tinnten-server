

class Question {
    constructor(data) {
        if (data != null) {
            this._id = data._id;
            this.conversationid = data.conversationid;
            this.questionText = data.questionText;
            this.important = data.important || "low"; // Varsayılan olarak "low"
            this.input_type = data.input_type || "";
            this.options = data.options || [];
            this.answer = data.answer || "";
            this.createdAt = data.createdAt;
            this.updatedAt = data.updatedAt;
        }
    }

    // 🔹 Getter Metodları
    getId() {
        return this._id;
    }

    getConversationId() {
        return this.conversationid;
    }

    getQuestionText() {
        return this.questionText;
    }

    getImportance() {
        return this.important;
    }

    getInputType() {
        return this.input_type;
    }

    getOptions() {
        return this.options;
    }

    getAnswer() {
        return this.answer;
    }

    getCreatedAt() {
        return this.createdAt;
    }

    getUpdatedAt() {
        return this.updatedAt;
    }

    // 🔹 Setter Metodları
    setConversationId(conversationid) {
        this.conversationid = conversationid;
    }

    setQuestionText(questionText) {
        this.questionText = questionText;
    }

    setImportance(important) {
        this.important = important;
    }

    setInputType(input_type) {
        this.input_type = input_type;
    }

    setOptions(options) {
        this.options = options;
    }

    setAnswer(answer) {
        this.answer = answer;
    }


}

module.exports = Question;