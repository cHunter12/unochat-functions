const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.addUser = functions.auth.user().onCreate(user =>
  admin
    .firestore()
    .collection("users")
    .doc(user.uid)
    .set({ name: user.email })
    .then(docRef => console.log("User added with ID:", docRef.uid))
    .catch(error => console.log("Something went wrong:", error))
);

exports.sendMessageNotification = functions.firestore
  .document("rooms/{roomId}/messages/{messageId}")
  .onWrite(async (change, context) => {
    const message = change.after.data();
    if (!message) {
      return console.log("Message removed");
    }

    const roomId = context.params.roomId;
    const messageId = context.params.messageId;
    console.log("New message:", messageId, "for room", roomId);

    return admin
      .firestore()
      .doc(`rooms/${roomId}`)
      .get()
      .then(doc => {
        if (!doc.exists) {
          return console.log("Room does not exist!");
        }

        const receiverUid = Object.values(doc.data().users).find(
          userId => userId !== message.senderId
        );
        console.log("Sending message to user", receiverUid);
        return admin
          .firestore()
          .doc(`users/${receiverUid}`)
          .get();
      })
      .then(doc => {
        const token = doc.data().token;

        const payload = {
          notification: {
            title: "New message",
            body: message.content
          }
        };

        return admin.messaging().sendToDevice(token, payload);
      })
      .catch(err => {
        return console.log("Error getting document", err);
      });
  });
