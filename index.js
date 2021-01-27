var fs = require('fs');
var mysql = require('mysql2');
const got = require('got');

const PATH = __dirname + "/test/";

var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'bonk'
});

let getUsername = async (uuid) => {
    if(uuid.startsWith("00000000"))
      return "Bedrock user"

    const response = await got(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);
    return JSON.parse(response.body).name;
}

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

FileList = [];

let readAll = () => {
  for(file of fs.readdirSync(PATH)){
    var xd = JSON.parse(fs.readFileSync(PATH + file));
    xd.file = file;
    FileList.push(xd);
  }
}
readAll();

(async () => {
  for(fileContent of FileList){
    var Stats = fileContent["stats"];
    var uuid = fileContent.file.split(".")[0];
    var name = await getUsername(uuid);

    console.time(name + " - " + uuid);
    for(var Table of Object.keys(Stats)){
      var FormattedKey = Table.split(":")[1];

      valuesName = "uuid VARCHAR(36) UNIQUE, name VARCHAR(16), ";
      values = {uuid: uuid, name: name};

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
    console.timeEnd(name + " - " + uuid);
  };

  //done with everything
  console.log("DONE");
  connection.end();
})();
