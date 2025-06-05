
const Message = require('../models/Message');

class Conversation {
  constructor(data) {
    if (data != null) {
      this._id = data._id;
      this.conversationid = data.conversationid;
      this.userid = data.userid;
      this.title = data.title || "";
      //this.messages = (data.messages || []).map(msg => new Message(msg));
      this.behaviors = data.behaviors || [];
      this.userBehaviorModel = data.userBehaviorModel || "";
      this.context = data.context || "";
      this.summary = data.summary || "";
      this.status = data.status || "active";
      this.delete = data.delete !== undefined ? data.delete : false;
      this.createdAt = data.createdAt;
      this.updatedAt = data.updatedAt;
    }
  }

  

  // Getters
  getId() {
    return this._id;
  }

  getConversationId() {
    return this.conversationid;
  }

  getUserId() {
    return this.userid;
  }

  getTitle() {
    return this.title;
  }

  /* getMessages() {
    return this.messages.map((item) => new Message(item));
  } */

  getMessage(index) {
    return this.messages.length > index ? this.messages[index] : null;
  }

  getBehaviors() {
    return this.behaviors;
  }

  getUserBehaviorModel() {
    return this.userBehaviorModel;
  }

  getContext() {
    return this.context;
  }

  getSummary() {
    return this.summary;
  }

  getStatus() {
    return this.status;
  }

  isDeleted() {
    return this.delete;
  }

  getCreatedAt() {
    return this.createdAt;
  }

  getUpdatedAt() {
    return this.updatedAt;
  }

  // Setters
  setConversationId(conversationid) {
    this.conversationid = conversationid;
  }

  setUserId(userid) {
    this.userid = userid;
  }

  setTitle(title) {
    this.title = title;
  }

 /*  setMessages(messages) {
    this.messages = messages.map(msg => new Message(msg));
  } */

 /*  addMessage(messageData) {
    const message = new MessageModel(messageData);
    this.messages.push(message);
  } */


  setBehaviors(behaviors) {
    this.behaviors = behaviors;
  }

  setUserBehaviorModel(userBehaviorModel) {
    this.userBehaviorModel = userBehaviorModel;
  }

  setContext(context) {
    this.context = context;
  }

  setSummary(summary) {
    this.summary = summary;
  }

  setStatus(status) {
    this.status = status;
  }

  setDeleted(deleteStatus) {
    this.delete = deleteStatus;
  }


  // MongoDB CRUD İşlemleri
}


module.exports = Conversation