const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const session = require('express-session');
const flash = require('connect-flash');

// Import your Sequelize models
const user = require('./models/users'); // Update the import path accordingly
const recipe = require('./models/recipedb'); // Update the import path accordingly
const sequelize = require('./models/database');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const app = express();
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(flash());
app.use(express.static(__dirname + '/public'));





app.use(session({
  secret: 'gyalbovai', // Change this to a strong, random string
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.successFlash = req.flash('success');
  res.locals.errorFlash = req.flash('error');
  next();
});

// File storage setup using Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      const foundUser = await user.findOne({ where: { username } });

      if (!foundUser) {
        return done(null, false, { message: 'Incorrect username.' });
      }

      const isPasswordValid = await bcrypt.compare(password, foundUser.password);

      if (!isPasswordValid) {
        return done(null, false, { message: 'Incorrect password.' });
      }

      return done(null, foundUser);
    } catch (error) {
      return done(error);
    }
  }
));




passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user1 = await user.findByPk(id);

    if (!user1) {
      return done(new Error('User not found.'));
    }

    return done(null, user1);
  } catch (error) {
    return done(error);
  }
});

app.get('/', async (req, res) => {
  try {
    await sequelize.authenticate();
    const recipes = await recipe.findAll();
    res.render('index', { recipes });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching recipes');
  }
});



app.get('/add', (req, res) => {
  res.render('add');
});

app.post('/add', upload.single('image'), async (req, res) => {
  const { title, ingredients, instructions } = req.body;
  const image = req.file.filename; // Get the uploaded image filename
  try {
    await recipe.create({
      title,
      ingredients,
      instructions,
      image,
    });

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error adding recipe');
  }
});


app.get('/edit/:id', upload.single('image'), async (req, res) => {
  const recipeId = parseInt(req.params.id);
  const selected = await recipe.findByPk(recipeId); // Use a different variable name here

  try {
    if (!selected) {
      return res.redirect('/');
    }
    res.render('edit', { recipe: selected });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating recipe');
  }
});

app.post('/edit', async (req, res) => {
  const recipeId = parseInt(req.body.recipeId);
  const { title, ingredients, instructions } = req.body;

  try {
    const updatedRecipe = await recipe.findByPk(recipeId);
    if (!updatedRecipe) {
      return res.redirect('/');
    }

    updatedRecipe.title = title;
    updatedRecipe.ingredients = ingredients;
    updatedRecipe.instructions = instructions;

    await updatedRecipe.save();
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating recipe');
  }
});


app.get('/delete/:id', async (req, res) => {
  const recipeId = parseInt(req.params.id);

  try {
    const recipeToDelete = await recipe.findByPk(recipeId);
    if (recipeToDelete) {
      await recipeToDelete.destroy();
    }
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error deleting recipe');
  }
});


app.get('/recipe/:id', async (req, res) => {
  const recipeId = parseInt(req.params.id);
  try {
    const selectedRecipe = await recipe.findByPk(recipeId);
    if (!selectedRecipe) {
      return res.redirect('/main');
    }
    res.render('inside_recipe', { recipe: selectedRecipe });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching recipe details');
  }
});



app.get('/login', (req, res) => {
  res.render('login', { message: req.flash('error') });
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/main',
  failureRedirect: '/login',
  failureFlash: true,
}));

app.get('/main', async (req, res) => {
  try {
    const recipes = await recipe.findAll(); // Fetch all car records using the car model
    res.render('main', { recipes }); // Render the 'home' template with car data
  } catch (error) {
    console.error('Error fetching Recipe:', error);
    res.status(500).send('An error occurred while fetching Recipe.');
  }
});

// Display signup page
app.get('/signup', (req, res) => {
  res.render('signup', { message: req.flash('error') });
});

// Handle signup form submission
app.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;


    const hashedPassword = await bcrypt.hash(password, 10);

    await user.create({
      username,
      email,
      password: hashedPassword,
    });

    res.redirect('/login');
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).send('An error occurred during signup.');
  }
});

app.get('/logout', (req, res) => {
  res.redirect('/');
});




// Sync models with the database
sequelize.sync()
  .then(() => {
    console.log('Database synced');
  })
  .catch((error) => {
    console.error('Error syncing database:', error);
  });

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
