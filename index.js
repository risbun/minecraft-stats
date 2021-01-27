var fs = require('fs');
var mysql = require('mysql');
const got = require('got');

const PATH = __dirname + "/dataz/";

var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'bonk'
});

/*
mojang ratelimit bad fakof
let getUsername = async (uuid) => {
    if(uuid.startsWith("00000000"))
      return "Bedrock user"

    const response = await got(`https://api.mojang.com/user/profiles/${uuid}/names`);
    var obj = JSON.parse(response.body);
    return obj[obj.length - 1].name;
}
*/

let ifNotExists = async (FormattedKey, values) =>{
  return new Promise((resolve, reject) => {
    connection.query(`INSERT INTO ${FormattedKey} SET ?`, values, async (error, results, fields) => {
      if (error) {
        if(error.errno == 1054){
          //404 row not found
          //add row for new data
          var line = error.sqlMessage.split(" ")[2]
          line = line.substr(1, line.length-2);
          connection.query("ALTER TABLE " + FormattedKey + " ADD " + line + " int(255)", (error, results, fields) => {
            if (error && error.errno != 1060) throw error;
          });

          ifNotExists(FormattedKey, values);
        }else if(error.errno == 1062){
          //already exists
          //alter row?
        }else{
          //someone else is bad? watafak
          throw console.error(error);
        }
      }
      //no error? ok continue
      resolve();
})})};

(async () => {
  for(file of fs.readdirSync(PATH)){
    var fileContent = await JSON.parse(fs.readFileSync(PATH + file))

    console.time(file);

    var Stats = fileContent["stats"];
    var uuid = file.substr(0, file.length-5);

    for(var Table of Object.keys(Stats)){
      var FormattedKey = Table.split(":")[1];

      valuesName = "uuid VARCHAR(16) UNIQUE, ";
      values = {uuid: uuid};

      for(var item in Stats[Table]){
        var key = item.split(":")[1];
        values["$"+key] = Stats[Table][item];
        valuesName += "$"+key + " INT, ";
      }

      valuesName = valuesName.substr(0, valuesName.length - 2);

      //not required, but recommended
      //connection.query(`CREATE TABLE IF NOT EXISTS ${FormattedKey} (${valuesName})`);

      await ifNotExists(FormattedKey, values);
    };

    //stop timer
    console.timeEnd(file);
  };

  //done with everything
  console.log("DONE");
  connection.end();
})();
