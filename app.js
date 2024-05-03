const express =  require ("express");
const bodyParser = require ("body-parser");
const mongoose = require('mongoose');
const compiler = require("compilex");
// const compilerApi = require('./api');

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
// Serve static files from the 'public' directory
app.use(express.static('public'));
// compiler addition 
const options = {stats:true};
compiler.init(options);  //init() creates a folder named temp in your project directory which is used for storage purpose. Before using other methods , make sure to call init() method.

// <-- setting the mongodb -->//
const uri = 'mongodb+srv://tarunrathore200:tarun2004@cluster0.kwuaivf.mongodb.net/CMZ';
mongoose.connect(uri);
const db = mongoose.connection;
db.on('error', console.error.bind(console,'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

let Check = {};
// <-- Defing the User Scema -->
const UserSchema =  new mongoose.Schema({
    name: {
        type: String,
        required: [true , "name is required"]
      },
      email: {
        type: String,
        required: true,
        //unique: true// Ensures uniqueness
      } ,
     password: {
        type: String,
        required: [true, "Password is required"]
     }
 });
 
 // <-- Defing the loginUser Scema -->
const loginSchema =  new mongoose.Schema({
      email: {
        type: String,
        required: true,
        //unique: true// Ensures uniqueness
      } ,
     password: {
        type: String,
        required: [true, "Password is required"]
     }
 });


  
   // <-- Defing the Question Scema -->
   const questionSchema = new mongoose.Schema({
    _id: Number,
    title: String,
    difficulty: String,
    topic: String,
    description: String,
    Input: mongoose.Schema.Types.Mixed, // Can be a string or array of strings
    Output: mongoose.Schema.Types.Mixed,
    notePoint: String,
    testCases: [{
        input: [mongoose.Schema.Types.Mixed], // Input can be of any type
        output: [mongoose.Schema.Types.Mixed] // Output can be of any type
    }]
  });


//Creating the mongoose Model for User Sign-up
const Cmzuser  = mongoose.model('Cmzuser', UserSchema);
//Creating the Model for Log-in Schema
const Loginuser = mongoose.model('loginuser', loginSchema);
//Creating the Model for Log-in Schema
const Question = mongoose.model('Question', questionSchema  );


//Route to handle form submission.  
app.post('/signup', async function (req, res) {
    const { name, email, password } = req.body; // Destructure the request body

    //Check if the email already exists
    const existingUser = await Cmzuser.findOne({ email: email });
    if (existingUser) {
        res.sendFile(__dirname + "/failure.html");
        
    } else {
        //If email is unique, create a new User instance and save the user's information into the database
        const newUser = new Cmzuser({
            name: name, 
            email: email,
            password: password
        });
        newUser.save();
        console.log("The data is Saved");
        res.sendFile(__dirname + "/success.html"); // Replace with the actual name of your successful page
    }
});

// <-- Log-in Logic -->
app.post("/login", async function(req,res){

const {mail , password2 } = req.body;

 Check = await Cmzuser.findOne({ email: mail });
if(Check.password === password2){
    try {
        const questions = await Question.find(); // Fetch all questions
        res.redirect("/")// Pass questions to the template
      } catch (err) {
        console.error('Error fetching questions:', err);
        res.status(500).send('Internal Server Error');
      }
}else{
    res.send("<h1> Wrong Details </h1>");
}
}); 


app.get("/", async function(req, res) {
    const page = parseInt(req.query.page) || 1; // Get the current page from query params, default to 1
    const perPage = 18; // Number of questions per page
    try {
        const totalQuestions = await Question.countDocuments();
        const totalPages = Math.ceil(totalQuestions / perPage);

        const questions = await Question.find()
            .skip((page - 1) * perPage) // Skip the correct number of documents
            .limit(perPage); // Limit the number of documents

        // Render the try.ejs file with the necessary variables
        res.render('try', {
            username: Check.name, // Pass the username here
            email: Check.email,
            questions: questions,
            totalPages: totalPages,
            currentPage: page
        });
    } catch (err) {
        console.error('Error fetching questions:', err);
        res.status(500).send('Internal Server Error');
    }
});

// <-- Questions filtering route -->
// Route to fetch questions with optional filtering
app.get("/questions", async (req, res) => {
    const { difficulty, topic } = req.query;
    let query = {};
    
    const page = parseInt(req.query.page) || 1; // Get the current page from query params, default to 1
    const perPage = 18; // Number of questions per page
    // Build the query based on provided parameters
    if (difficulty) {
        query.difficulty = difficulty;
    }
    if (topic) {
        query.topic = topic;
    }
    
    
    try {
        const totalQuestions = await Question.countDocuments();
        const totalPages = Math.ceil(totalQuestions / perPage);

        const questions1 = await Question.find(query)
            .skip((page - 1) * perPage) // Skip the correct number of documents
            .limit(perPage); // Limit the number of documents
        
        res.render('try', {
            username: Check.name, // Pass the username here
            email: Check.email,
            questions: questions1,
            totalPages: totalPages,
            currentPage: page
        });
        


    } catch (err) {
        console.error('Error fetching questions:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.get("/questions/:id", async (req, res) => {
compiler.flush(function(){
    console.log("temp files deleted")
})
    const questionId = req.params.id;
//   console.log(questionId);
//   console.log("running");
    try{
        const question = await Question.findById(questionId);
        if(!question){
            return res.status(404).send("Question not found");
        }
    
        res.render('singleQuestion',{ username: Check.name, questions : question});

    }
     catch(err){
      console.error("Error fetching question: ", err);
      res.status(500).send('Internal Server Error');
     }
});

// cmpiler post 
app.post("/questions/:id/compile",function(req,res){
    var code = req.body.code;
    var input = req.body.input;
    var lang = req.body.lang;
   console.log(" i am inside the compile");
      try{ console.log(" i am inside the try and catch");
          if(lang == "C++"){console.log(" i am inside the cpp");
              if(!input){console.log(" i am inside the if");
                  var  envdata = {OS:"windows",cmd:"g++",options:{timeout:10000}};
                  compiler.compileCPP(envdata,code,function(data){
                    console.log(data.output);
                    if(data.output)
                      {res.send(data);}
                    else{
                    console.log(" i am inside else");
                      res.end({output:"error"});}
                  });
              }
              else{
                console.log("i am inside else , when input exists");
                  let envData = {OS:"windows",cmd:"g++",options:{timeout:10000}};
                  compiler.compileCPPWithInput(envData,code,input,function(data){
                    console.log(data.output);
                    if(data.output)
                      res.send(data);
                    else
                      res.end({output:"error"});
                  });
              }
          }
          else if(lang == "Java"){
              if(!input){
                  let envData = {OS:"windows"};
                  compiler.compileJava(envData,code,function(data){
                    
                   if(data.output)
                      res.send(data);
                    else
                      res.end({output:"error"});
                  });
              }
              else{
                  let envData = {OS:"windows"};
                  compiler.compileJavaWithInput(envData,code,input,function(data){
                    if(data.output)
                      res.send(data);
                    else
                      res.end({output:"error"});
                  });
              }
          }
          else if(lang == "Python"){
              if(!input){
                  let envData = {OS:"windows"};
                  compiler.compilePython(envData,code,function(data){
                      if(data.output)
                        res.send(data);
                      else
                        res.end({output:"error"});
                  });
              }
              else{
                  let envData = {OS:"windows"};
                  compiler.compilePythonWithInput(envData,code,input,function(data){
                      if(data.output)
                       res.send(data);
                      else
                       res.end({output:"error"});
                  });
              }
          }
      }
      catch(e){
          console.log("Error");
      }
  });

  // To run testcases and verify the user's code.
  app.post("/questions/:id/check", async function(req, res) {
    var code = req.body.code;
    var input = req.body.input;
    var lang = req.body.lang;
   console.log(" i am inside the compile");
      try{ console.log(" i am inside the try and catch");
          if(lang == "C++"){console.log(" i am inside the cpp");
              if(!input){console.log(" i am inside the if");
                  var  envdata = {OS:"windows",cmd:"g++",options:{timeout:10000}};
                  compiler.compileCPP(envdata,code,function(data){
                    console.log(data.output);
                    if(data.output)
                      {res.send(data);}
                    else{
                    console.log(" i am inside else");
                      res.end({output:"error"});}
                  });
              }
              else{
                console.log("i am inside else , when input exists");
                  let envData = {OS:"windows",cmd:"g++",options:{timeout:10000}};
                  compiler.compileCPPWithInput(envData,code,input,function(data){
                    console.log(data.output);
                    if(data.output)
                      res.send(data);
                    else
                      res.end({output:"error"});
                  });
              }
          }
          else if(lang == "Java"){
              if(!input){
                  let envData = {OS:"windows"};
                  compiler.compileJava(envData,code,function(data){
                    
                   if(data.output)
                      res.send(data);
                    else
                      res.end({output:"error"});
                  });
              }
              else{
                  let envData = {OS:"windows"};
                  compiler.compileJavaWithInput(envData,code,input,function(data){
                    if(data.output)
                      res.send(data);
                    else
                      res.end({output:"error"});
                  });
              }
          }
          else if(lang == "Python"){
              if(!input){
                  let envData = {OS:"windows"};
                  compiler.compilePython(envData,code,function(data){
                      if(data.output)
                        res.send(data);
                      else
                        res.end({output:"error"});
                  });
              }
              else{
                  let envData = {OS:"windows"};
                  compiler.compilePythonWithInput(envData,code,input,function(data){
                      if(data.output)
                       res.send(data);
                      else
                       res.end({output:"error"});
                  });
              }
          }
      }
      catch(e){
          console.log("Error");
      }
  


});
  



// app.post("/questions/:id/check", async function(req, res) {
    
//         var code = req.body.code;
//         var input = req.body.input;
//         var lang = req.body.lang;
//         console.log("i am inside the compile2");
 
//         // Retrieve the predefined input from MongoDB based on the :id parameter
//         let question = await Question.findById(req.params.id);
//         if (!question) {
//             return res.status(500).send({ error: "Question not found" });
//         }
 
//         // Check if the user's input matches the predefined input
//         if (input === question.testCases[0].input) {
//             try {
//                 console.log("i am inside the try and catch2");
//                 if (lang == "C++") {
//                     console.log("i am inside the cpp2");
//                     if (!input) {
//                         var envdata = { OS: "windows", cmd: "g++", options: { timeout: 10000 } };
//                         compiler.compileCPP(envdata, code, function(data) {
//                             console.log(data.output);
//                             if (data.output) {
//                                 res.send(data);
//                             } else {
//                                 console.log("i am inside else2");
//                                 res.end({ output: "error" });
//                             }
//                         });
//                     } else {
//                         console.log("i am inside else, when input exists2");
//                         let envData = { OS: "windows", cmd: "g++", options: { timeout: 10000 } };
//                         compiler.compileCPPWithInput(envData, code, input, function(data) {
//                             console.log(data.output);
//                             if (data.output) {
//                                 res.send(data);
//                             } else {
//                                 res.end({ output: "error" });
//                             }
//                         });
//                     }
//                 } else if (lang == "Java") {
//                     if (!input) {
//                         let envData = { OS: "windows" };
//                         compiler.compileJava(envData, code, function(data) {
//                             if (data.output) {
//                                 res.send(data);
//                             } else {
//                                 res.end({ output: "error" });
//                             }
//                         });
//                     } else {
//                         let envData = { OS: "windows" };
//                         compiler.compileJavaWithInput(envData, code, input, function(data) {
//                             if (data.output) {
//                                 res.send(data);
//                             } else {
//                                 res.end({ output: "error" });
//                             }
//                         });
//                     }
//                 } else if (lang == "Python") {
//                     if (!input) {
//                         let envData = { OS: "windows" };
//                         compiler.compilePython(envData, code, function(data) {
//                             if (data.output) {
//                                 res.send(data);
//                             } else {
//                                 res.end({ output: "error" });
//                             }
//                         });
//                     } else {
//                         let envData = { OS: "windows" };
//                         compiler.compilePythonWithInput(envData, code, input, function(data) {
//                             if (data.output) {
//                                 res.send(data);
//                             } else {
//                                 res.end({ output: "error" });
//                             }
//                         });
//                     }
//                 }
//             } catch (e) {
//                 console.log("Error");
//             }
//         } else {
//             // User's input does not match predefined input
//             return res.status(400).send({ error: "Wrong input" });
//         }
//     } 
//  );
 













// <--TO SHOW HOMEPAGE -->
app.get("/home" , function(req , res){
    res.sendFile(__dirname + "/HomePage.html")
});

// <--DIRECT TO LOG-IN PAGE-->
app.post("/log-in.html" , function(req, res){
    res.sendFile(__dirname + "/log-in.html");
});

// <--DIRECT TO SIGN-UP PAGE-->
app.post("/signup.html" , function(req , res){
    res.sendFile(__dirname + "/signup.html")
});

// <-- Failure Post [When email is not Unique -->
app.post("/failure", function (req , res) {
    res.sendFile(__dirname + "/signup.html");
});

app.post("/success", function (req , res) {
    res.sendFile(__dirname + "/log-in.html");
});

app.post("/contactUs", function (req , res) {
    res.redirect("/home");
});
app.get("/contactUs", function (req , res) {
    res.sendFile(__dirname + "/contactUs.html");
});
app.get("/register", function (req , res) {
    res.sendFile(__dirname + "/signup.html");
});
app.get("/feedback", function (req , res) {
    res.sendFile(__dirname + "/feedback.html");
});
app.get("/aboutUs", function (req , res) {
    res.sendFile(__dirname + "/aboutUs.html");
});



app.listen( 3001 , function (){
    console.log("listening on the port 3001");
}); 



// app.post('/signup',   function(req, res) {
//     const { name, email, password } = req.body; // Destructure the request body
  
//     // If email is unique, create a new User instance
//     const newUser = new Cmzuser({
//       name: name,
//       email: email,
//       password: password
//     });
//     newUser.save();
//     console.log("The data is Saved");
// });



// <--  split screen rendering --> 
// app.post("/login", async function(req,res){
//     const {mail , password2 } = req.body;
//      Check = await Cmzuser.findOne({ email: mail });
//     if(Check.password === password2){
//         res.render('splitscreen', {userName: Check.name });
//     }else{
//         res.send("<h1> Wrong Details </h1>");
//     }
//     }); 

