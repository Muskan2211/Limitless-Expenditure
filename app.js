//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:true}));


app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://admin-muskan:"+process.env.PASSWORD+"@cluster0.ipkcv.mongodb.net/LimitExpenceDB", {useNewUrlParser: true, useUnifiedTopology: true} );
mongoose.set("useCreateIndex", true);

const itemsSchema=new mongoose.Schema({
  email:String,
  password:String,
  todos: [{
      name:String
    }],
  expences: [
    {
        date: Date,
        typ:String,
        text:String,
        amount:String,
        desc:String
    }
  ]
});

itemsSchema.plugin(passportLocalMongoose);

const Item = mongoose.model("Item", itemsSchema);

passport.use(Item.createStrategy());
passport.serializeUser(function(user, done){
  done(null, user.id);
});
passport.deserializeUser(function(id, done){
  Item.findById(id, function(err, user){
    done(err, user);
  });
});

var today=new Date();
var options = {
  weekday:"long",
  month:"numeric",
  day:"numeric",
  year:"numeric"
};
var date=today.toLocaleDateString("en-US");
var year=today.getFullYear();

var islogin=false;

app.get("/", function(req, res){
  res.render("home", {yearmat:year, btntype:islogin});
});

app.post("/delete", function(req, res){
  const checkedItemId = req.body.listbox;
  Item.updateOne({'_id': req.user.id},
                  {$pull:{"todos": {_id: checkedItemId}}},
                 {safe:true},
               function(err, obj){

               });
  console.log("sucessfully deleted!");
  res.redirect("/list");
});

app.get("/login", function(req, res){
  res.render("login", {yearmat:year, btntype:islogin});
});

app.get("/register", function(req, res){
  res.render("register",{yearmat:year, btntype:islogin});
});

app.get("/logout", function(req, res){

  req.logout();
  islogin=false;
  res.redirect("/");
});

app.get("/list", function(req, res){
  if(req.isAuthenticated()){
    islogin=true;
    Item.findById(req.user.id, function(err, foundUser){
      if(err){
        console.log(err);
        res.redirect("/login");
      }else{
        if(foundUser){

          res.render("list",{
            datemat:date,
            yearmat:year,
            newListItems: foundUser.todos,
            btntype:islogin
          });
        }
      }
    });
  }
});

//-----------------------------------------------------

app.get("/daily", function(req, res){

  if(req.isAuthenticated()){
    islogin=true;
    Item.findById(req.user.id, function(err, foundUser){
      if(err){
        console.log(err);
        res.redirect("/login");
      }
      else{
        if(foundUser){
          res.render("daily",{
            datemat:date,
            yearmat:year,
            btntype:islogin,
            newexpense:foundUser.expences
          });
        }
      }
    });
  }
});

app.post("/daily", function(req, res){
  let currday=req.body.newdate;
  let savetype=req.body.expensetype;
  let itembuy=req.body.itembought;
  let money=req.body.price;
  let describ=req.body.description;
  console.log(req.body);
  let taskitem={
    date:currday,
    typ:savetype,
    text:itembuy,
    amount:money,
    desc:describ
  };

  console.log(req.body);

  Item.findById(req.user.id, function(err, foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        foundUser.expences.push(taskitem);
        foundUser.save(function(){
          res.redirect("/daily");
        });
      }
    }
  });
});

app.post("/deletedaily", function(req, res){
  const checkedItemId = req.body.dailybox;
  Item.updateOne({'_id': req.user.id},
                  {$pull:{"expences": {_id: checkedItemId}}},
                 {safe:true},
               function(err, obj){

               });
  console.log("sucessfully deleted!");
  res.redirect("/daily");
});

//--------------------------------------------------------------------------------------------
app.post("/list", function(req, res){
  let task=req.body.tasktodoform;
  let taskitem={
    name:task
  };
  Item.findById(req.user.id, function(err, foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        foundUser.todos.push(taskitem);
        foundUser.save(function(){
          res.redirect("/list");
        });
      }
    }
  });
});

app.post("/login", function(req, res){
  const user = new Item({
    usename: req.body.username,
    password: req.body.password
  });
  req.login(user, function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/list");
      });
    }
  });
});

app.post("/register", function(req, res){
  Item.register({username: req.body.username}, req.body.password, function(err, user){
    if(err){
      console.log(err);
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/list");
      });
    }
  });
});


let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function (){
  console.log("server started on port 3000");
});
