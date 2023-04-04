const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const mySecret = process.env['MONGO_URI']
mongoose.connect(mySecret, { useNewUrlParser: true, useUnifiedTopology: true });


const UserExerciseLogSchema = new mongoose.Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date },
});

const UserExerciseSchema = new mongoose.Schema({
  username: { type: String, required: true },
  log: [UserExerciseLogSchema],
});

let UserExercise = mongoose.model('UserExercise', UserExerciseSchema);

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', (req, res) => {
  const username = req.body.username;
  let msg = new UserExercise({
    username: username,
  });
  msg.save(function(err, result) {
    res.json({
      username: result.username,
      _id: result._id,
    });
  });
});

app.get('/api/users', (req, res) => {
  UserExercise.find({})
    .select({ _id: 1, username: 1 })
    .exec(function(err, docs) {
      res.json(docs);
    });
});

app.post('/api/users/:_id/exercises', (req, res) => {
  console.log(req.body);
  const description = req.body.description;
  const duration = parseInt(req.body.duration);
  const getDate = req.body.date;
  let newDate = new Date();
  if (getDate) {
    newDate = new Date(getDate);
  }
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const weekday = weekdays[newDate.getUTCDay()];
  const month = months[newDate.getUTCMonth()];
  const day = String(newDate.getUTCDate()).padStart(2, '0');
  const year = newDate.getUTCFullYear();
  const date = `${weekday} ${month} ${day} ${year}`;

  UserExercise.findById(req.params._id).exec(function(err, data) {
    const newLog = {
      description,
      duration,
      date
    };
    data.log.push(newLog);
    data.save(function(err, result) {
      const newJson = {
        _id: result._id,
        username: result.username,
        date,
        duration,
        description,
      };
      res.json(newJson);
    });
  });
});

const formatDate = (date) => {
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  }) ;
  return formattedDate.replace(/,/g, '');
}

app.get('/api/users/:_id/logs', (req, res) => {
  console.log('req.params', req.query);
  const query = { _id: req.params._id };
  const dateFrom = req.query.from;
  const dateFromRes = dateFrom ? formatDate(new Date(dateFrom)) : null;
  const dateTo = req.query.to;
  const dateToRes = dateTo ? formatDate(new Date(dateTo)) : null;
  const limit = req.query.limit ? parseInt(req.query.limit) : undefined;

  UserExercise.findOne(query)
    .select({ _id: 1, username: 1, log: { description: 1, duration: 1, date: 1 } })
    .exec(function(err, result) {
      const filterLog = result?.log?.filter(f=>{
        let check = true;
        if (dateFrom && dateTo) {
          check = f.date>=new Date(dateFrom)&&f.date<=new Date(dateTo);
        } else if (dateFrom) {
          check = f.date>=new Date(dateFrom);
        } else if (dateTo) {
          check = f.date<=new Date(dateTo);
        }
        return check;
      }) || [];
      console.log("filterLog ",filterLog);
      const formattedLog = filterLog.map(log => {
        console.log("log ",log);
        return { ...log.toObject(), date: formatDate(log.date) };
      })|| [];
      if(limit > 0){
        formattedLog.splice(limit)
      }
      const count = formattedLog.length;      
    console.log('result',result);
      const resJson = { 
        ...result.toObject(), 
        count,
        log: formattedLog };
      if(dateFromRes){
        resJson['from'] = dateFromRes
      }
      if(dateFromRes){
        resJson['to'] = dateToRes
      }
      res.json(resJson);
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
