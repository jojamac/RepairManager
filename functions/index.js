const {setGlobalOptions} = require("firebase-functions");

// Opciones globales para Cloud Functions
setGlobalOptions({maxInstances: 10});
