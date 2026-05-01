'use strict';
const express = require('express');
const https = require('https');
const fs = require('fs');

const puppeteer = require('puppeteer');
const multer = require('multer');
const path = require('path');

//const spawn = require('child_process').spawn;

const app = express();
const mysql = require('mysql');
const { Console } = require('console');
app.use(express.static('public'));

// Multer Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    //cb(null, 'uploads/');
    cb(null, 'public/upload/');
  },
  filename: (req, file, cb) => {
    //cb(null, Date.now() + '-' + file.originalname);
    cb(null,file.originalname);
  },
});
const upload = multer({ storage });

const { exec } = require('child_process');

const fileContent = fs.readFileSync('./enadsys.json', "utf8");
const fileJsonContent = JSON.parse(fileContent);
var db_ip=fileJsonContent.db_ip;
var db_dbase=fileJsonContent.db_dbase;
var db_host=fileJsonContent.db_host;
//console.clear();
console.log(fileJsonContent);
/*
var zcon = mysql.createConnection({
  host: 'sql100.infinityfree.com',   
  user: 'if0_41775435',
  password: 'xyrupp5115',
  database: 'if0_41775435_cho_db'
});

var con = mysql.createConnection({
  host: 'sql12.freesqldatabase.com',   
  user: 'sql12824640',
  password: 'JqMM7WYgbS',
  database: 'sql12824640'
});
*/
var con = mysql.createConnection({
  host: db_ip,   
  user: 'root',
  password: '',
  database: db_dbase
});
con.connect((err) => {
 if(err){
   console.log('Error connecting to Db');   
   return;
 }
 console.log('Connection established');   
});

//==================================================================================================
//==================================================================================================
// Backup Database 0
app.get('/backup', function(req, res) {
  console.log(process.env.PATH);
  let filename=req.query.filename;  
  console.log('filename: '+filename);
  // Database configuration
  const dbConfig = {
    host: db_ip,   
    user: 'root',
    password: '',
    database: db_dbase
  };
  // Backup configuration
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }
  let backupFileName = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;
  backupFileName=filename+'.sql';
  const backupFilePath = path.join(backupDir, backupFileName);

  // Create a MySQL connection
  const connection = mysql.createConnection(dbConfig);

  // Connect to the database
  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to the database:', err.stack);
      return;
    }
    console.log('Connected to the Source database');

    // Execute mysqldump command
    //const mysqldump = `mysqldump -h ${dbConfig.host} -u ${dbConfig.user} -p ${dbConfig.password} ${dbConfig.database} > ${backupFilePath}`;
    //const mysqldump = `mysqldump --quick -h ${dbConfig.host} -u ${dbConfig.user} ${dbConfig.password} ${dbConfig.database} > ${backupFilePath}`;
    const mysqldump = `mysqldump -h ${dbConfig.host} -u ${dbConfig.user} ${dbConfig.database} > ${backupFilePath}`;
    let ans=`Backup successful! File saved to ${backupFilePath}`;
    exec(mysqldump, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error during backup: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        return;
      }
      console.log(ans);
      res.send(ans);
    });

    // Close the database connection
    connection.end();
  });
  //res.send('Completed');
});
//==================================================================================================
//==================================================================================================
// Check file exist
app.post('/fileExist', function(req, res) {
  let filename=req.query.filename;  
  console.log('filename: '+filename);  
  const backupDir = path.join(__dirname, 'backups/',filename);
  console.log('>>> '+backupDir);
  let rval=false;
  if (fs.existsSync(backupDir)) {
    rval=true;    
  }
  res.send(rval);
});

//==================================================================================================
//==================================================================================================
// File Upload Endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  //res.json({ message: 'File uploaded successfully', filename: req.file.filename });
  res.send('OK');
});
//==================================================================================================
//==================================================================================================
// get total rlocks
app.get('/api/get_tot_lock', function(req, res){
  let jeSQL="SELECT * FROM locker";    
  con.query(jeSQL,[],function (err, result) {
    if (err) throw err;    
    else res.send(result);   
  });    
});
//==================================================================================================
//==================================================================================================
// drop all rlocks
app.delete('/api/drop_rlock', function(req, res){
  /*
  fs.writeFileSync('./records.json', JSON.stringify([], null, 2));
  res.send('All Record Locks Dropped'); 
  */
  var jeSQL="DELETE from locker";
  con.query(jeSQL,[],function (err, result) {  
    if (err) throw err;    
    res.send('All Record Locks Dropped'); 
  });
});

// get latest docno
app.get('/api/get_latest', function(req, res){    
  let trans=req.query.trans;  
  let docno=req.query.docno;  
  let new_arr=[]; let ctr_arr=0;
  let new_docno='';
  //console.log('trans:'+trans+' vs docno:'+docno);
  /*
  var filepath='./records.json';
  const data = JSON.parse(fs.readFileSync(filepath, "utf8"));
  console.log('data:'+data.length);
  //new_arr.sort(JBE_SORT_ARRAY(['descrp']));
  for(var i=0;i<data.length;i++){
    if(data[i].status=='ADD' && data[i].trans==trans){ 
      new_arr[ctr_arr]=data[i].docno;
      ctr_arr++;
    }
  }
  */

  let jeSQL="SELECT * FROM locker WHERE trans=?";    
  con.query(jeSQL,[trans],function (err, result) {
    if (err) throw err;    
    //else res.send(result);   
    else{
      //new_arr=result; 
      for(var i=0;i<result.length;i++){
        if(result[i].status=='ADD' && result[i].trans==trans){ 
          new_arr[ctr_arr]=result[i].docno;
          ctr_arr++;
        }
      }

      //console.log('new_arr:'+new_arr.length);
      if(new_arr.length > 0){
        new_arr.sort();
        new_docno=new_arr[new_arr.length-1];
      }  
      //console.log('new_docno:'+new_docno);
      res.send(new_docno);
    }
  });    
});

// get rlock NEW
/*
app.get('/api/get_rlock', function(req, res){    
  let trans=req.query.trans;  
  let docno=req.query.docno;  
  let new_arr=[];
  var filepath='./records.json';
  const data = JSON.parse(fs.readFileSync(filepath, "utf8"));

  for(var i=0;i<data.length;i++){
    if(data[i].trans==trans && data[i].docno==docno){
      new_arr=data[i];
      break;
    }
  }
  //console.log('data:'+new_arr);
  res.send(new_arr);
});
*/

app.get('/api/get_rlock', function(req, res){    
  let trans=req.query.trans;  
  let docno=req.query.docno;    
  let jeSQL="SELECT * FROM locker WHERE trans=? AND docno=?";  
  
  con.query(jeSQL,[trans,docno],function (err, result) {
    if (err) throw err;    
    else res.send(result);    
  });  
});

app.put('/api/add_rlock', function(req, res){  
  /*
  let arr=req.query.arr;  
  var filepath='./records.json';
  const data = JSON.parse(fs.readFileSync(filepath, "utf8"));
  data.push(JSON.parse(arr));

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  //console.log('add');
  res.send('added'); 
  */
  let arr=req.query.arr;
});

app.delete('/api/del_rlock', function(req, res){ 
  let trans=req.query.trans;  
  let docno=req.query.docno;
  
  var jeSQL="DELETE from locker where trans=? and docno=?";
  con.query(jeSQL,[trans,docno],function (err, result) {  
    if (err) throw err;
    else res.send('Record Lock released:'+docno);
  });

  //res.send('Record Lock released:'+docno); 
});

app.put('/api/chg_rlock', function(req, res){ 
  let trans=req.query.trans;  
  let docno=req.query.docno;  
  let new_docno=req.query.new_docno;
  //console.log(trans+' vs '+new_docno);
  /*
  var filepath='./records.json';
  const data = JSON.parse(fs.readFileSync(filepath, "utf8"));

  for(var i=0;i<data.length;i++){
    if(data[i].trans==trans && data[i].docno==docno){
      data[i].docno=new_docno;
    }
  }
    
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  */

  let jeSQL="UPDATE locker SET docno=? WHERE trans=? AND docno=?";
  con.query(jeSQL,[new_docno,trans,docno],function (err, result) {  
    if (err) throw err;    
    else res.send('Record Docno Changed to:'+new_docno);  
  });   
});
//==================================================================================================
//==================================================================================================

// get enadsys
app.get('/api/get_system', function(req, res){  
  const filepath = './enadsys.json';
  const data = JSON.parse(fs.readFileSync(filepath));
  res.send(data);
});

app.put('/api/save_system', function(req, res){  
  let param = req.query.ob;  
  //console.log('param from client '+param);
  //test connection of new ip  
  var scon = mysql.createConnection({
    host: param,   
    user: 'root',
    password: '',
    database: 'coldroom_db'
  });
  scon.connect((err) => {
   if(err){
     //console.log('Error:'+param+' is unreachable...');
     //console.log('Current IP is still : '+db_ip);
     res.send("FAILED");
   }else{
    con=scon;
    var filepath='./enadsys.json';
    const data = JSON.parse(fs.readFileSync(filepath));
    data.db_ip = param; //update IP
    //console.log('Connection established');   
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    res.send("OK");
   }   
 });
});

// routes

app.get('/api/get_all', function(req, res){
  let tbl = req.query.tbl;  
  var jeSQL="SELECT * FROM "+tbl;
  con.query(jeSQL,function (err, result) {
    if (err) throw err;    
    else res.send(result);    
  });  
});

app.delete('/api/xclear_ptr', function (req, res) {
  var jeSQL="DELETE from ptr where areano=?";
  con.query(jeSQL,0,function (err, result) {  
    if (err) throw err;    
    else res.send(result);    
  });  
});

app.get('/api/get_ptr', function(req, res){    
  var jeSQL="SELECT * FROM ptr";    
  con.query(jeSQL,function (err, result) {
    if (err) throw err;    
    else res.send(result);    
  });  
});
app.get('/api/get_area', function(req, res){    
  var jeSQL="SELECT * FROM area";    
  con.query(jeSQL,function (err, result) {
    if (err) throw err;    
    else res.send(result);    
  });  
});

app.get('/api/get_users', function(req, res){  
  var jeSQL="SELECT * FROM user";    
  con.query(jeSQL,function (err, result) {
    if (err) throw err;    
    else res.send(result);    
  });  
});

app.get('/api/get_user', function(req, res){  
  let clientno = req.query.clientno;
  let userid = req.query.userid;
  let pword = req.query.pword;
  var jeSQL="SELECT usercode,username,userid,pword,usertype FROM user WHERE clientno=? AND userid=? AND pword=?";  
  
  con.query(jeSQL,[clientno,userid,pword],function (err, result) {
    if (err) throw err;    
    else res.send(result);    
  });  
});

app.put('/api/upd_loc', function (req, res) {
  let lat = req.query.lat;
  let lng = req.query.lng;
  let usercode = req.query.usercode;  
  let clientno = req.query.clientno;
  let jeSQL="UPDATE user SET lat=?, lng=? WHERE usercode=? AND clientno=?";
  con.query(jeSQL,[lat,lng,usercode,clientno],function (err, result) {  
    if (err) throw err;    
    else res.send(result);    
  });  
});

app.put('/api/save_user', function (req, res) {
  let clientno = req.query.clientno;    
  let usercode = req.query.usercode;  

  let userid = req.query.userid;  
  let pword = req.query.pword;  
  let username = req.query.username;  
  let addrss = req.query.addrss;  
  let photo = req.query.photo;  
  let celno = req.query.celno;  
  let usertype = req.query.usertype;  
  let lat = req.query.lat;
  let lng = req.query.lng;
  let d_active = req.query.d_active;
    
  let jeSQL="INSERT INTO user (userid,pword,username,addrss,photo,celno,usertype,lat,lng,d_active,usercode,clientno) VALUES (?,?,?,?,?, ?,?,?,?,?, ?,?)";  
  con.query(jeSQL,[userid,pword,username,addrss,photo,celno,usertype,lat,lng,d_active, usercode,clientno],function (err, result) {  
    if (err) throw err;    
    else{
      var jeSQL="SELECT * FROM user";    
      con.query(jeSQL,function (err, result) {
        if (err) throw err;    
        else res.send(result);    
      }); 
    }  
  });  
});

app.put('/api/upd_user', function (req, res) {
  let clientno = req.query.clientno;    
  let usercode = req.query.usercode;  

  let userid = req.query.userid;  
  let pword = req.query.pword;  
  let username = req.query.username;  
  let addrss = req.query.addrss;  
  let photo = req.query.photoName;  
  let photoImg = req.query.photoImg;  
  let celno = req.query.celno;  
  let usertype = req.query.usertype;  
  let lat = req.query.lat;
  let lng = req.query.lng;
    
  let jeSQL="UPDATE user SET userid=?,pword=?,username=?,addrss=?,photo=?,celno=?,usertype=?,lat=?,lng=? WHERE usercode=? AND clientno=?";
  con.query(jeSQL,[userid,pword,username,addrss,photo,celno,usertype,lat,lng, usercode,clientno],function (err, result) {  
    if (err) throw err;    
    else{
      /*
      let a =  photoImg
      let m =  a.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        
      let b =  Buffer.from(m[2],'base64');
      fs.writeFile(photoName,b,function(err){
        if(!err){
          console.log("file is created")
        }
      });
      */
      //res.send(result);    
      var jeSQL="SELECT * FROM user";    
      con.query(jeSQL,function (err, result) {
        if (err) throw err;    
        else res.send(result);    
      });     
    }
  });  
});

app.delete('/api/del_ptr', function (req, res) {
  let trano=req.query.trano;  
  //console.log('server: '+trano);  
  let aryRes=[];
  let jeSQL="DELETE from ptr where trano=?";
  con.query(jeSQL,[trano],function (err, result) {  
    if (err) throw err;    
    else{
      aryRes[0]=result;      
      let jeSQL="DELETE from ptr2 where trano=?";
      con.query(jeSQL,[trano],function (err, result) {  
        if (err) throw err;    
        else{
          aryRes[1]=result;    
          res.send(aryRes);    
        }
      });  
    } 
  });  
});

app.delete('/api/del_ptr2', function (req, res) {
  let trano=req.query.trano;  
  //$xsql="DELETE from ".$fle." where clientno=:clientno";  
  var jeSQL="DELETE from ptr2 where trano=?";
  con.query(jeSQL,[trano],function (err, result) {  
    if (err) throw err;    
    else res.send('deleted 2 : '+result);    
  });  
});


app.put('/api/cancel_ptr', function (req, res) {
  let trano=req.query.trano;  
  let trans=req.query.trans;  
  var jeSQL="UPDATE ptr SET trans=? WHERE trano=?";  
  con.query(jeSQL,[trans,trano],function (err, result) {  
    if (err) throw err;    
    else{
      var jeSQL="UPDATE ptr2 SET trans=? WHERE trano=?";  
      con.query(jeSQL,[trans,trano],function (err, result) {  
        if (err) throw err;    
        else{
          var jeSQL="SELECT * FROM ptr";    
          con.query(jeSQL,function (err, result) {
            if (err) throw err;    
            else res.send(result);    
          }); 
        }
      });
    }   
  });  
});

app.put('/api/upd_ptr', function (req, res) {
  let trano=req.query.trano;  
  let ptrdate=req.query.ptrdate;  
  let ptrdate_rel=req.query.ptrdate_rel;  
  let areano=req.query.areano;  
  let details=req.query.details;  
  var jeSQL="UPDATE ptr SET ptrdate=?,date_rel=?,areano=?,details=? WHERE trano=?";  
  con.query(jeSQL,[ptrdate,ptrdate_rel,areano,details,trano],function (err, result) {  
    if (err) throw err;    
    else{
      var jeSQL="SELECT * FROM ptr";    
      con.query(jeSQL,function (err, result) {
        if (err) throw err;    
        else res.send(result);    
      }); 
    }   
  });  
});
app.post('/api/save_ptr', function (req, res) {
  let trano=req.query.trano;  
  let ptrdate=req.query.ptrdate;  
  let ptrdate_rel=req.query.ptrdate_rel;  
  //console.log('1.) zptrdate_rel:'+ptrdate_rel);
  let ptrType=req.query.ptrType;  
  let areano=req.query.areano;  
  let details=req.query.details;  
  let name=req.query.name;  
  let pos=req.query.pos;  
  let tel=req.query.tel;  

  //console.log('add ptr');
  var jeSQL="INSERT INTO ptr (trano,ptrdate,date_rel,type,areano,details,rcvd_name,rcvd_pos,rcvd_tel) VALUES (?,?,?,?,?, ?,?,?,?)";  
  con.query(jeSQL,[trano,ptrdate,ptrdate_rel,ptrType,areano,details,name,pos,tel],function (err, result) {  
    if (err) throw err;    
    else{
      var jeSQL="SELECT * FROM ptr";    
      con.query(jeSQL,function (err, result) {
        if (err) throw err;    
        else res.send(result);    
      }); 
    }  
  });  
});
app.post('/api/save_ptr2', function (req, res) {
  let trano=req.query.trano;  
  let ptrdate=req.query.ptrdate;  
  let ptrdate_rel=req.query.ptrdate_rel;  
  //console.log('2.) xptrdate_rel:'+ptrdate_rel);
  let ptrType=req.query.ptrType;  
  let areano=req.query.areano;  
  let expiry=req.query.expiry;  
  let stockno=req.query.stockno;  
  let descrp=req.query.descrp;  
  let lotno=req.query.lotno;  
  let nostock=req.query.nostock;  
  let refno=req.query.refno;
  let rqty=req.query.rqty;  
  //rqty=123;
  let loc=req.query.loc;  
  let qty=req.query.qty;  
  let cost=req.query.cost;  
  let amount=req.query.amount; 
  //console.log(rqty);
  var jeSQL="INSERT INTO ptr2 (trano,ptrdate,date_rel,type,areano,expiry,stockno,descrp,lotno,nostock,refno,rqty,loc,cost,qty,amount) VALUES (?,?,?,?,?,?, ?,?,?,?,?, ?,?,?,?,?)";  
  con.query(jeSQL,[trano,ptrdate,ptrdate_rel,ptrType,areano,expiry,stockno,descrp,lotno,nostock,refno,rqty,loc,cost,qty,amount],function (err, result) {  
    if (err) throw err;   
    else res.send(result);        
  });  
});

app.put('/api/upd_ptr_rcvd', function (req, res) {
  let trano=req.query.trano;  
  let name=req.query.name;  
  let pos=req.query.pos;  
  let tel=req.query.tel;  
  var jeSQL="UPDATE ptr SET rcvd_name=?,rcvd_pos=?,rcvd_tel=? WHERE trano=?";  
  con.query(jeSQL,[name,pos,tel,trano],function (err, result) {  
    if (err) throw err;   
    else res.send('Receiver Saved...'); 
  });  
});

app.put('/api/upd_ret_rcvd', function (req, res) {
  let trano=req.query.trano;  
  let name=req.query.name;  
  let pos=req.query.pos;  
  let tel=req.query.tel;  
  var jeSQL="UPDATE ret SET rcvd_name=?,rcvd_pos=?,rcvd_tel=? WHERE trano=?";  
  con.query(jeSQL,[name,pos,tel,trano],function (err, result) {  
    if (err) throw err;   
    //else res.send('Receiver Saved... : '+name); 
    else{
      var jeSQL="SELECT * FROM ret";    
      con.query(jeSQL,function (err, result) {
        if (err) throw err;    
        else res.send(result);    
      }); 
    } 
  });  
});
//========================================================================================================
//========================================================================================================
//========================================================================================================

app.put('/api/upd_repl_fld_data', function (req, res) {
  let db=req.query.db;  
  let fld=req.query.fld;  
  let data=req.query.data;  
  let fld2=req.query.fld2;  
  let data2=req.query.data2; 
  var jeSQL='UPDATE '+db+' SET '+fld+'=? WHERE '+fld2+'=?';  
  con.query(jeSQL,[data,data2],function (err, result) {  
    if (err) throw err;    
    else{
      var jeSQL="SELECT * FROM "+db;    
      con.query(jeSQL,function (err, result) {
        if (err) throw err;    
        else res.send(result);    
      }); 
    }   
  });  
});

app.put('/api/upd_loc_stock', function (req, res) {
  let bal = req.query.bal;
  let loc = req.query.loc;
  let stockno = req.query.stockno;  
  let lotno = req.query.lotno;

  let jeSQL="UPDATE transfer2 SET balance=? WHERE loc=? and stockno=? and lotno=?";
  con.query(jeSQL,[bal,loc,stockno,lotno],function (err, result) {  
    if (err) throw err;    
    else{
      var jeSQL="SELECT * FROM transfer2";    
      con.query(jeSQL,function (err, result) {
        if (err) throw err;    
        else res.send(result);    
      }); 
    }     
  });  
});

//========================================================================================================
//======FM_LIB==================================================================================================
app.get('/api/fmlib', function(req, res){
  let jeSQL = req.query.sql;  
  let params = req.query.fld;  
  let tbl = req.query.tbl;
  let fm_mode = req.query.fm_mode;
  
  //console.log(fm_mode+':jeSQL:'+jeSQL);
  //console.log('fld:'+params);

  con.query(jeSQL,params,function (err, result) {
    if (err) throw err;    
    //else if(fm_mode==1){
    else{
      var jeSQL='SELECT * FROM '+tbl;    
      //console.log('jeSQL 2:'+jeSQL);
      con.query(jeSQL,function (err, result) {
        if (err) throw err;    
        else res.send(result);    
      }); 
    }
  });  
});
app.post('/api/fmlib', function(req, res){
  let jeSQL = req.query.sql;  
  let params = req.query.fld;  
  let tbl = req.query.tbl;
  let fm_mode = req.query.fm_mode;
  
  //console.log(fm_mode+':jeSQL:'+jeSQL);
  //console.log('fld:'+params);

  con.query(jeSQL,params,function (err, result) {
    if (err) throw err;    
    //else if(fm_mode==1){
    else{
      var jeSQL='SELECT * FROM '+tbl;    
      //console.log('jeSQL 2:'+jeSQL);
      con.query(jeSQL,function (err, result) {
        if (err) throw err;    
        else res.send(result);    
      }); 
    }
  });  
});
app.put('/api/fmlib', function(req, res){
  let jeSQL = req.query.sql;  
  let params = req.query.fld;  
  let tbl = req.query.tbl;
  let fm_mode = req.query.fm_mode;
  
  //console.log(fm_mode+':jeSQL:'+jeSQL);
  //console.log('fld:'+params);

  con.query(jeSQL,params,function (err, result) {
    if (err) throw err;    
    //else if(fm_mode==1){
    else{
      var jeSQL='SELECT * FROM '+tbl;    
      //console.log('jeSQL 2:'+jeSQL);
      con.query(jeSQL,function (err, result) {
        if (err) throw err;    
        else res.send(result);    
      }); 
    }
  });  
});
app.delete('/api/fmlib', function(req, res){
  let jeSQL = req.query.sql;  
  let params = req.query.fld;  
  let tbl = req.query.tbl;
  let fm_mode = req.query.fm_mode;
  
  //console.log(fm_mode+':jeSQL:'+jeSQL);
  //console.log('fld:'+params);

  con.query(jeSQL,params,function (err, result) {
    if (err) throw err;    
    //else if(fm_mode==1){
    else{
      var jeSQL='SELECT * FROM '+tbl;    
      //console.log('jeSQL 2:'+jeSQL);
      con.query(jeSQL,function (err, result) {
        if (err) throw err;    
        else res.send(result);    
      }); 
    }
  });  
});
//========================================================================================================
app.get('/api/fmlib_get', function(req, res){
  let jeSQL = req.query.sql;  
  let params = req.query.fld;  
  //console.log(jeSQL);
  con.query(jeSQL,params,function (err, result) {
    if (err) throw err;    
    else res.send(result);    
  });  
});


app.post('/api/fmlib_save', function(req, res){
  let jeSQL = req.query.sql;  
  let params = req.query.fld;  
  let tbl = req.query.tbl;
  let fm_mode = req.query.fm_mode;
  
  //console.log(fm_mode+':jeSQL:'+jeSQL);
  //console.log('fld:'+params);

  con.query(jeSQL,params,function (err, result) {
    if (err) throw err;    
    //else if(fm_mode==1){
    else{
      var jeSQL='SELECT * FROM '+tbl;    
      //console.log('jeSQL 2:'+jeSQL);
      con.query(jeSQL,function (err, result) {
        if (err) throw err;    
        else res.send(result);    
      }); 
    }
  });  
});

app.post('/api/fmlib_save_2', function(req, res){
  let jeSQL = req.query.sql;  
  let params = req.query.fld;  
  let tbl = req.query.tbl;
  let fm_mode = req.query.fm_mode;
  
  //console.log(fm_mode+':jeSQL:'+jeSQL);
  //console.log('fld:'+params);

  con.query(jeSQL,params,function (err, result) {
    if (err) throw err;    
    //else if(fm_mode==1){
    else{
      var jeSQL='SELECT * FROM '+tbl;    
      //console.log('jeSQL 2:'+jeSQL);
      con.query(jeSQL,function (err, result) {
        if (err) throw err;    
        else res.send(result);    
      }); 
    }
  });  
});

app.put('/api/fmlib_update', function(req, res){
  let jeSQL = req.query.sql;  
  let fld = req.query.fld;  
  let tbl = req.query.tbl;
  let fm_mode = req.query.fm_mode;
  
  con.query(jeSQL,fld,function (err, result) {
    if (err) throw err;    
    else{
      var jeSQL='SELECT * FROM '+tbl;
      con.query(jeSQL,function (err, result) {
        if (err) throw err;    
        else res.send(result);    
      }); 
    }
  });  
});

app.delete('/api/fmlib_del', function(req, res){
  let jeSQL = req.query.sql;  
  let params = req.query.fld;  
  let tbl = req.query.tbl;
  let select = req.query.select; 
  
  //console.log('del jeSQL:'+jeSQL);
  //console.log('del fld:'+params);
  //console.log('del tbl:'+tbl);

  con.query(jeSQL,params,function (err, result) {
    if (err) throw err;    
    else{
      if(select){
        var jeSQL="SELECT * FROM "+tbl;    
        con.query(jeSQL,function (err, result) {
          if (err) throw err;    
          else res.send(result);    
        }); 
      }
    }
  });  
  
});

app.post('/api/save_transfer2', function (req, res) {
  let trano=req.query.trano;
  let loc=req.query.loc;
  let stockno=req.query.stockno;
  let lotno=req.query.lotno;
  let refno=req.query.refno;     
  let qty=req.query.qty;
  var jeSQL="INSERT INTO transfer2 (trano,loc,stockno,lotno,refno,qty) VALUES (?,?,?,?,?, ?)";  
  con.query(jeSQL,[trano,loc,stockno,lotno,refno,qty],function (err, result) {  
    if (err) throw err;    
    else{
      var jeSQL="SELECT * FROM transfer2";    
      con.query(jeSQL,function (err, result) {
        if (err) throw err;    
        else res.send(result);    
      }); 
    }  
  });  
}); 

//========================================================================================================
//========================================================================================================
//========================================================================================================

// This responds a POST request for the homepage
app.post('/', function (req, res) {
  //console.log("Got a POST request for the homepage");
  res.send('Hello POST');
});

// This responds a DELETE request for the /del_user page.
app.delete('/del_user', function (req, res) {
   //console.log("Got a DELETE request for /del_user");
   res.send('Hello DELETE');
});

///////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////
var server = app.listen(db_host, function () {
  var host = server.address().address
  var port = server.address().port
  console.log("App listening at http://%s:%s", host, port)
});
///////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////
