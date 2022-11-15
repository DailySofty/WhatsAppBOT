var usuario, senha;

function readFom() {
usuario = document.getElementById("user").value;
senha = document.getElementById("password").value;

  console.log(usuario, senha);
}

/**document.getElementById("insert").onclick = function () {
  readFom();

  firebase
    .database()
    .ref("users/" + usuario)
    .set({
        usuario: usuario,
        senha: senha,
    });
  alert("Data Inserted");
  document.getElementById("user").value = "";
  document.getElementById("password").value = "";

};
*/
document.getElementById("login").onclick = function () {
  const userLogin = document.getElementById('user-login').value 
  console.log(userLogin)
  let login = false
  console.log(login)

    firebase
    .database()
    .ref("users/" + userLogin)
    .on("value" , function (snap){
        const userVal = snap.val();
      if(userVal){
        console.log(snap.val().usuario)
        if (snap.val().usuario == userLogin) {
          const divPassword = document.getElementById('divPassword').value
          if(snap.val().senha == divPassword){
            console.log("logou!")
            login = true
          }
        }
      }
    })


  if(login == true) {
    window.location.href = 'buttons.html';
  }else{
    const divAlert = document.getElementById('alerta');
    divAlert.classList.remove("hide");
    setTimeout(function(){
      divAlert.classList.add("hide");
    },5000);
  };
}

//document.getElementById("read").onclick = function () {
  //readFom();

 // firebase
 //   .database()
 //   .ref("users/" + usuario)
 //   .on("value", function (snap) {
 //   document.getElementById("user").value  = snap.val().usuario;
 //   document.getElementById("password").value  = snap.val().senha;
 //   });
//};

//document.getElementById("update").onclick = function () {
 // readFom();

 // firebase
 //   .database()
 //   .ref("users/" + usuario)
//    .update({
      //   usuario: usuario,
//      usuario: usuario,
//      senha: senha,
//    });
//  alert("Data Update");
//  document.getElementById("user").value = "";
//  document.getElementById("password").value = "";
//};
/** document.getElementById("delete").onclick = function () {
 readFom();

  firebase
    .ref("users/" + usuario)
   .remove();
  alert("Data Deleted");
  document.getElementById("user").value = "";
  document.getElementById("password").value = "";
};
*/