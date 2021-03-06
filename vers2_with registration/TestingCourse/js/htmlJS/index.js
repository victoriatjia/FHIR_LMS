//Langguage setting
if(web_language=="CH")
{
	info.pageName= "學習平台";
}
else if(web_language=="EN")
{
	info.pageName= "Learning Platform";
}

//Show Page Title and Header (need to initialize info.pageName beforehand)
document.title= info.courseName + "-" + info.pageName;
document.getElementById("header").innerHTML= info.courseName + "<br>" + info.pageName;
//Variable Initialization
let user = new CPerson();

//Function Initialization
$(document).ready(function(){
	let ret= sessionGet("loginAccount");
	if(ret==null) {
		//redirect users to login page
		window.location.href = "login.html";
	} 
	else {
		//init page
		user.id = ret.userLogin.id;
		user.name = ret.userLogin.name;
		user.username = ret.userLogin.username;
		$("#intro").html("Welcome, " + user.name + "!");
		
		let arr= ret.patientID;
		for(item in arr) {
			globalPatientID=arr[item].split('/')[1];
			let urlStr= FHIRURL + "Patient/" + globalPatientID;
			getResource(FHIRURL, 'Patient', '/' + globalPatientID, FHIRResponseType, 'getPatientByID');
		};
	}
});

function getPatientByID(obj){
	let patientID = (obj.id) ? obj.id : '';
	let organizationID =(obj.managingOrganization.reference) ? obj.managingOrganization.reference.split('/')[1] : '';
	let p = new CPatient(patientID, organizationID)
	groupMember.newMember(p);
	getResource(FHIRURL, 'Organization', '/' + organizationID, FHIRResponseType, 'getOrganizationByID');
}

function getOrganizationByID(obj){
	let organizationID = (obj.id) ? obj.id : '';
	let organizationName = (obj.name) ? obj.name : '';
	groupMember.patient.filter(x => x.organizationID == organizationID && x.organizationName == '')[0].organizationName = organizationName; //must only return 1 row
	let patientID= groupMember.patient.filter(x => x.organizationID == organizationID)[0].patientID; 
	//document.getElementById("titleDiv").innerHTML= organizationName + " - " + info.pageName;					//organizationName
	getResource(FHIRURL, 'Appointment', '?actor=Patient/' + patientID, FHIRResponseType, 'getAppointmentByPatientID');
}

//Retrieve: Slot ID
function getAppointmentByPatientID(obj){
	if (obj.total == 0)	alert('無資料');
	else{
		obj.entry.map((entry, i) => {
			let appointmentID = (entry.resource.id) ? entry.resource.id : '';
			let slotID= (entry.resource.slot) ? entry.resource.slot[0].reference.split('/')[1] : '';
			//Jangan include appointment dan slot id ke dalam CSchedule, only include scheduleID dan material
			// let appointment = new CAppointment(appointmentID, slotID);
			// let schedule = new CSchedule();
			// schedule.newAppointment(appointment);
			// groupMember.newCourse(schedule);
			//#UbahIni
			if(i==0)
			getResource(FHIRURL, 'Slot', '/' + slotID, FHIRResponseType, 'getSlotByID');
		});
	}
}

//Retrieve: Schedule ID
function getSlotByID(obj){
	let slotID= (obj.id) ? obj.id : '';
	let scheduleID= (obj.schedule) ? obj.schedule.reference.split('/')[1] : '';
	//groupMember.courseIsExist(scheduleID);
	getResource(FHIRURL, 'Schedule', '/' + scheduleID, FHIRResponseType, 'getSchedule');	//http://203.64.84.213:8080/fhir/PlanDefinition?composed-of=Schedule/1738
}

function getSchedule(obj){
	let scheduleID = (obj.id) ? obj.id : '';
	let courseName = (obj.specialty) ? obj.specialty[0].coding[0].display : '';
	let practitionerRoleID = (obj.actor) ? obj.actor[0].reference : '';				
	let courseStartDate= (obj.planningHorizon.start) ? obj.planningHorizon.start.split("T")[0] : '';
	let courseEndDate= (obj.planningHorizon.end) ? obj.planningHorizon.end.split("T")[0] : '';
	
	if(!groupMember.courseIsExist(scheduleID))
	{
		let schedule = new CSchedule(scheduleID, courseName, courseStartDate, courseEndDate, practitionerRoleID);
		groupMember.newCourse(schedule);
	}
	getResource(FHIRURL, 'PlanDefinition', '?composed-of=Schedule/' + scheduleID, FHIRResponseType, 'getMaterialByScheduleID');	//http://203.64.84.213:8080/fhir/PlanDefinition?composed-of=Schedule/1738
}

function getMaterialByScheduleID(obj){
	if (obj.total == 0)	alert('無資料');
	else{
		obj.entry.map((entry, i) => {
			var index=1;	//since relatedArtifact[0] store Schedule information instead of material 
			let scheduleID= entry.resource.relatedArtifact ? entry.resource.relatedArtifact[0].resource.split("/")[1] : "";
			let relatedArtifactLen= entry.resource.relatedArtifact ? entry.resource.relatedArtifact.length : 0;
			while(index < relatedArtifactLen)
			{
				let temp= entry.resource.relatedArtifact[index];
				let type= temp.display.split("-")[1];
				let title= temp.display.split("-")[2];
				let url= temp.url? temp.url : '';
				if(type=='questionnaire')
					url+= '?studentID=' + groupMember.patient[0].patientID + '&subjectID=' + course1.scheduleID.split('/')[1];
				let material= new CMaterial(type, title, url);
				groupMember.course.filter(x => x.scheduleID == scheduleID)[0].material.push(material); //must only return 1 row
				index++;
			}
		});
	}
	showMyCourse();
}

function showMyCourse(){
	var table= document.getElementById("TableAppointment");
	var cellIndex;
	var row, noIndex=1, videoName;
	
	//check per organization
	let indexTable;
	for (indexTable=0;indexTable<groupMember.patient.length;indexTable++){											
		table.innerHTML+= '<tr><th bgcolor="#ebebe0" colspan="2">My Course List</th></tr>';
		//check per schedule
		let namaDosen='';
		groupMember.course.forEach(item => {
			document.getElementById("intro").innerHTML+= '<br>Student ID: ' + groupMember.patient[0].patientID;
			document.getElementById("intro").innerHTML+= '<br>Course Period: ' + item.courseStartDate + ' until ' + item.courseEndDate;
			table.innerHTML+= '<tr><th>No.</th><th>Course Material</th></tr>';
			var indexNo=1;
			//check per slot
			item.material.forEach(item2 => {		//per Slot
				row = table.insertRow(-1);
				row.align="left";
				row.insertCell(0).innerHTML= indexNo++ + ".";
				if(item2.url=="")
				{
					row.insertCell(1).innerHTML= item2.title + "<br>	(ppt will be upload soon)";
				}
				//When PPT url is provided, create anchor
				else
				{
					elLink = document.createElement('a');
					elLink.target= "_blank";
					elLink.innerHTML = item2.title;
					elLink.href = item2.url;
					row.insertCell(1).appendChild(elLink);
				}
			});
		});
	}
}

// <!-- function linkToCourseSelection(){ -->
	// <!-- var queryParam= 'personID=' + globalPersonID; -->
	// <!-- window.open('courseSelection.html?' + queryParam, "_blank"); -->
// <!-- } -->

function logOut(){			
	 window.sessionStorage.removeItem("loginAccount");
	 window.location.href = "login.html";
}
