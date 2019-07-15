const jsforce = require('jsforce');
const yargs = require('yargs');
const camelcase = require('camelcase');
const fs = require('fs');
const mkdirdp = require('mkdirp');
const {pd} = require('pretty-data');
const path = require('path');

//node index convert-buttons --username "bhalchandra@integrate.com" --password "eleg@nt@1992" --securityToken "cqb2wiqu2jgqUEAiUzyGn0gk" --loginUrl "https://login.salesforce.com"
var argv = yargs.usage('Usage: $0 <command> [options]')
    .command('convert-buttons', 'Convert SF Custom buttons to LWC components')
    .example('node $0 convert-buttons --username [username] --password [password] --securityToken [securityToken] --loginUrl [loginUrl]', 'Convert Salesforce Buttons to LWC')
    .nargs('username', 1)
    .nargs('password', 1)
    .nargs('securityToken', 1)
    .nargs('loginUrl', 1)
    .nargs('sfversion',1)
    .demandOption(['username', 'password', 'loginUrl'])
    .describe('username', 'Username of the SF org')
    .describe('password', 'Password of the SF org')
    .describe('securityToken', 'Security Token,if applicable')
    .describe('loginUrl', 'Either https://test.salesforce.com or https://login.salesforce.com or custom domain name')
    .describe('sfversion','Specify the Salesforce version of the org where you wish to deploy LWC')
    .help('h')
    .alias('h', 'help')
    .epilog('Copyright 2019! Created by Bha(t/l)aForce!!')
    .argv;

let {
    username = '', password = '', securityToken = '', loginUrl, sfversion = '45.0'
} = argv;
sfversion = Number(sfversion).toFixed(1);
const outputsFolder= './outputs'
const basePath = `${outputsFolder}/lwc`;
const query = "select id, LWcText__c,LWc_Names__c from account where LWc_Names__c!=NULL";

login({
    username,
    password,
    securityToken,
    loginUrl,
    onLogin: convert2LWC,
    onLoginFailure: onLoginFailure
});


function convert2LWC({
    conn
}) {
    conn.query(query, function(err, result) {
        if (err) {
            return console.error(err);
        }
        let {records} = result;
       	
		let typesString = '';
        records.forEach(function(record){
        	const name = record["LWc_Names__c"];
        	const jsContent = record["LWcText__c"];
        	const camelCaseName =  camelcase(name);
        	console.log(`Creating bundle ${camelCaseName}...`)
    		mkdirdp.sync(`${basePath}/${camelCaseName}`);
    		console.log(`Created bundle ${camelCaseName}...`)
    		console.log(`Creating js file  ${camelCaseName}.js ...`)
    		fs.writeFileSync(`${basePath}/${camelCaseName}/${camelCaseName}.js`,jsContent);
    		console.log(`Created js file  ${camelCaseName}.js ...`);
    		const jsMetaFileTemplate = `<?xml version="1.0" encoding="UTF-8"?>
				<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata" fqn="${camelCaseName}">
				    <apiVersion>${sfversion}</apiVersion>
				    <isExposed>true</isExposed>
				</LightningComponentBundle>`;
        	console.log(`Creating js-meta file  ${camelCaseName}.js-meta.xml...`);
        	fs.writeFileSync(`${basePath}/${camelCaseName}/${camelCaseName}.js-meta.xml`,pd.xml(jsMetaFileTemplate));
        	console.log(`Created js-meta file  ${camelCaseName}.js-meta.xml...`);
 			typesString+=`<members>${camelCaseName}</members>`;

        });
        console.log(`Completed Creating LWC components @${path.resolve(basePath)}`);
        console.log('Creating package.xml..')
        console.log(typesString);
        const packageXMLBaseString = `<?xml version="1.0" encoding="UTF-8"?>
			<Package xmlns="http://soap.sforce.com/2006/04/metadata">
				<types>
				${typesString}
				</types>
				<name>LightningComponentBundle</name>
				<version>${sfversion}</version>
		</Package>`;
		const prettyPackageXML = pd.xml(packageXMLBaseString);
		fs.writeFileSync(`${outputsFolder}/package.xml`,prettyPackageXML);
		console.log('Created package.xml..')

    });
}

function login({
    username,
    password,
    securityToken,
    loginUrl,
    channel,
    replayId,
    onLogin,
    onLoginFailure
}) {
    var conn = new jsforce.Connection({
        loginUrl
    });
    console.log('Logging into Salesforce');
    conn.login(username, password + securityToken, function(errors, userInfo) {
        if (errors) {
            if (onLoginFailure && typeof onLoginFailure === 'function') {
                onLoginFailure(errors)
                return;
            }

        }
         console.log('Logged into Salesforce');
        if (onLogin && typeof onLogin === 'function') {
            onLogin({
                conn
            });
        }

    });


}



function onLoginFailure(errors) {
    console.error(errors);
}