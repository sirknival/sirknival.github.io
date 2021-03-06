/********************
 * CUSTOM FUNCTIONS *
 ********************/

//@function endStartup
//Check if do not show again box is check and set appropriate 
//cookie if true. Afterwards overlay will be removed completely
function endStartup () {
	var status = document.getElementById("showStartupAgain").checked;
	if(status==true) {
		document.cookie = "showStartUp=false; expires=Thu, 31 Dec 2030 23:59:59 UTC; path=/; SameSite=Lax";
	}
	
	document.getElementById("overlay_layer").remove();
	document.getElementById("overlay_startup").remove();
}


//@function endStartup
//Checks if the cookie includes showStartUp-tag and extract its value
//If true, startup overlay will be shown, otherwise it will be skipped
//and removed
function checkCookies() {
	var cookie = document.cookie.split(';');
	var startUpflag = true;

	for (i in cookie) {
		if (cookie[i].includes("showStartUp")) {
			var state = cookie[i].replace("showStartUp=", "").trim();
			if (state=="false"){
				startUpflag = false;
				break;
			}
		}
	}
	if (startUpflag) {
		document.getElementById("overlay_layer").style.visibility = "visible";
		document.getElementById("overlay_startup").style.visibility = "visible";
	}
	else if (!startUpflag){
		endStartup ();
	}

}

//@function resetCookie
//Resets the cookie,which causes startup overlay to show again 
//and notifies the user
function resetCookie () {
	document.cookie = "showStartUp=true; expires=Thu, 31 Dec 2030 23:59:59 UTC; path=/";
	alert("Cookie gelöscht!");
}
