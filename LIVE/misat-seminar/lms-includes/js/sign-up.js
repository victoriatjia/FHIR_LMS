//Initialize temporary variable
loginData = {
	person:{
		id: '',
		identifier: '',
		name: '',
		username: '',
		gender: '',
		nationality: '',
		jobPosition: '',
		highestEduDegree: '',
		institution: ''
	},
	patient:{
		id: ''
	},
	organization: {
		id: '',
		identifier: '',
		status: '',	
		name: '',		
		cpname: '',
		cpphone: '',
		cpemail: ''
	},
	schedule: {
		id: '',
		code: '',
		name: '',		
		practitionerRoleID: '',
		practitionerName: '',
		maxParticipant: 0,
		currentParticipant: 0
	},
	slot:{
		id: []
	},
	appointment:{
		id: '',
		bookingsuccess: false
	}
}

//Set table field
let field= {
	code: ["Name", "Email", "Password", "Gender", "Nationality" ,"Institution", "JobPosition"],
	placeholder: ["", "", "", "例如： 慈濟大學 / 慈濟醫院", "例如： 學生 / 教授 / 護理人員", ],
	desc: [],
	isRequired: [1,1,1,1,1],		
	type: ["text", "email", "password", "text", "text", "text"]			
};

if(web_language=="CH")
{
	field.desc= ["姓名", "Email", "密碼", "就讀機構", "職稱"];
	pageName= "註冊網頁";
}
else if(web_language=="EN")
{
	field.desc= ["Name", "Email", "Password", "Educational/Working Institution", "Job Position"];
	field.placeholder= ["", "", "", "e.g. Tzu Chi University", "e.g. Student"];
	pageName= "Sign Up";
}

//local variable for store temporary json obj
let personJSON, apptJSON;

//Function Initialization
$(document).ready(function(){
	// Clear session
	let stringValue = window.sessionStorage.getItem("loginAccount")
    if (stringValue != null) 
	{
		window.sessionStorage.removeItem("loginAccount");
	}
	showForm();
});


function showForm()
{
	let temp="";
	// Show Login Form field
	for(let i=0; i<field.desc.length;i++){
		temp += '<tr><td class="col-01">' + field.desc[i];
		if(field.isRequired[i])			
			temp += '<font color="red"> *</font>';
		
		temp += '</td><td class="col-02">:&nbsp;<input class="signup-field" type="' + field.type[i] + '" id="' + field.code[i] + '" placeholder="' + field.placeholder[i] + '" ';
		
		if(field.type[i] == "password")
			temp += 'onkeyup="SHA256PWD.value = sha256(this.value);" ';
			
		if(field.isRequired[i])			
			temp += 'required';
			
		temp += '><br></td></tr>';
	}
	temp+= '<tr><td colspan="2" align="right"><input id="signup-btn" type="button" value="Submit" onclick="validateData()"></td></tr>';
	$("#signup-table").html(temp);
	
	// Get Organization Information
	getResource(FHIRURL, 'Organization', '/' + DB.organization, FHIRResponseType, 'getOrganization');
}

function getOrganization(str){
	let obj= JSON.parse(str);
	if(retValue(obj))
	{
		loginData.organization.id = (obj.id) ? obj.id : '';
		loginData.organization.identifier= (obj.identifier)? obj.identifier[0].value : '';
		loginData.organization.status= (obj.active == true) ? 'Active' : 'Inactive';
		loginData.organization.name= (obj.name) ? obj.name : '';
		if (obj.contact)
		{
			loginData.organization.cpname= obj.contact[0].name.text;
			obj.contact[0].telecom.map((telecom, i) => {
				if (telecom.system == "email")
					loginData.organization.cpemail= telecom.value;
				else if (telecom.system == "phone")
					loginData.organization.cpphone= telecom.value;
			});
		}
	}
	// Get Schedule Information
	getResource(FHIRURL, 'Schedule', '/' + DB.schedule, FHIRResponseType, 'getSchedule');
}

function getSchedule(str){
	let obj= JSON.parse(str);
	if(retValue(obj))
	{
		loginData.schedule.code= (obj.specialty)? obj.specialty[0].coding[0].code : '';
		loginData.schedule.name= (obj.specialty)? obj.specialty[0].coding[0].display : '';
		loginData.schedule.practitionerRoleID= (obj.actor) ? obj.actor[0].reference.split('/')[1] : '';
		loginData.schedule.practitionerName= (obj.actor) ? obj.actor[0].display : '';
	}
	showWebsiteInfo();
}

//Show Page Title and Header (need to initialize page name beforehand)
function showWebsiteInfo()
{
	document.title= loginData.schedule.name + " - " + pageName;
	$("#header").html(loginData.schedule.name + "<br>" + pageName);
}

//Validate data input by user
function validateData(){
let str="{status='waitlist'}";

	if(checkRequiredField(field)){
		$("#global-loader").show();
		loginData.person.name= $('#Name').val();
		loginData.person.username= $("#Email").val();
		loginData.person.jobPosition= $("#JobPosition").val();
		loginData.person.institution= $("#Institution").val();
		getResource(FHIRURL, 'Person', '?identifier=' + loginData.person.username, FHIRResponseType, 'verifyUser');
	}
}

//Verify FHIR Person & Patient exist or not 
function verifyUser(str){ 
	let obj= JSON.parse(str);
	//if person exist -> alert "user exist"
	if (obj.total > 0)
	{			
		alert(message.accountExist + '\n' + 'If you are the owner of "' + loginData.person.username + '" this account, please login directly');
		$("#global-loader").hide();
	}
	//if person unexist -> check slot availability -> create new Person ->  create new Patient
	else 
	{
		getResource(FHIRURL, 'Slot', '?schedule=' + DB.schedule, FHIRResponseType, 'getSlotID');
	}
}

//Get all slot ID 
function getSlotID(str){ 
	let obj= JSON.parse(str);
	
    obj.entry.map((entry, i) => {
		loginData.slot.id.push(entry.resource.id);
	});
	createPerson();
}

//Create new FHIR Person
function createPerson(){
	initialize();
	
	personJSONobj.identifier[0].value= loginData.person.username;
	personJSONobj.identifier[1].value= $('#SHA256PWD').val();
	personJSONobj.identifier[2].value= loginData.person.jobPosition;
	personJSONobj.identifier[3].value= loginData.person.institution;
	personJSONobj.name[0].text= loginData.person.name;
	personJSONobj.telecom[0].value= loginData.person.username;
	personJSONobj = JSON.stringify(personJSONobj);
	postResource(FHIRURL, 'Person', '', FHIRResponseType, "createPatient", personJSONobj);
}

function finalResult(str){
	let obj= JSON.parse(str);
	if (!isError(obj.resourceType, message.signUpFail + message.contactPerson))
	{
		$("#global-loader").hide();
		alert(message.signUpOK);
		window.close();
	}
}