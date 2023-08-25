const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const session = require('express-session');
const cookieParser = require("cookie-parser");
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const {v4: uuidv4} = require('uuid');

const user = require('./models/users');
const recipe = require('./models/recipedb');
const sequelize = require('./models/database');

const app = express();
const port = 3000;


app.use(express.urlencoded({extended: true}));
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.static(__dirname + '/public'));
app.use(express.json());
app.use(cookieParser());


const oneDay = 1000 * 60 * 60 * 24;
app.use(session({
    secret: "thisismysecretkeybecuaseIamdonhehahafhrgfgrfrty84fwir767",
    saveUninitialized: true,
    cookie: {maxAge: oneDay},
    resave: false
}));

app.use(passport.initialize());
app.use(passport.session());


const storage = multer.diskStorage({
    destination: './public/uploads',
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({storage: storage});


passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            const foundUser = await user.findOne({where: {username}});

            if (!foundUser) {
                return done(null, false, {message: 'Incorrect username.'});
            }

            const isPasswordValid = await bcrypt.compare(password, foundUser.password);

            if (!isPasswordValid) {
                return done(null, false, {message: 'Incorrect password.'});
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
        res.render('index', {recipes});
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching recipes');
    }
});


app.get('/login', (req, res) => {
    res.render('login', { message: '' });
});

app.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.render('login', { message: 'Incorrect username or password.' });
        }
        req.logIn(user, (err) => {
            if (err) {
                return next(err); // Pass the error to the next middleware
            }
            return res.redirect('/main');
        });
    })(req, res, next);
});


app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/signup', async (req, res) => {
    try {
        const {username, email, password} = req.body;
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
    req.session.destroy();
    res.redirect('/');
});


app.get('/add', (req, res) => {
    if (req.isAuthenticated()) {
        res.render('add');
    } else {
        res.redirect('/login');
    }
});

app.post('/add', upload.single('image'), async (req, res) => {
    if (req.isAuthenticated()) {
        const {title, ingredients, instructions} = req.body;
        const image = req.file.filename;
        try {
            await recipe.create({
                id: uuidv4(),
                title,
                ingredients,
                instructions,
                image,
            });
            res.redirect('/main');
        } catch (error) {
            console.error(error);
            res.status(500).send('Error adding recipe');
        }
    } else {
        res.redirect('/login');
    }
});


app.get('/edit/:id', upload.single('image'), async (req, res) => {
    if (req.isAuthenticated()) {
        const recipeId = req.params.id;
        const selected = await recipe.findByPk(recipeId);

        try {
            if (!selected) {
                return res.redirect('/');
            }
            res.render('edit', {recipe: selected});
        } catch (error) {
            console.error(error);
            res.status(500).send('Error updating recipe');
        }
    } else {
        res.redirect('/login');
    }
});


app.post('/edit/:id', upload.single('newImage'), async (req, res) => {
    if (req.isAuthenticated()) {
        const recipeId = req.params.id;
        const { title, ingredients, instructions } = req.body;
        const newImage = req.file;

        try {
            const updatedRecipe = await recipe.findByPk(recipeId);
            if (!updatedRecipe) {
                return res.redirect('/');
            }

            updatedRecipe.title = title;
            updatedRecipe.ingredients = ingredients;
            updatedRecipe.instructions = instructions;

            if (newImage) {
                updatedRecipe.image = newImage.filename;
            }

            await updatedRecipe.save();
            res.redirect('/main');
        } catch (error) {
            console.error(error);
            res.status(500).send('Error updating recipe');
        }
    } else {
        res.redirect('/login');
    }
});


app.get('/delete/:id', async (req, res) => {
    if (req.isAuthenticated()) {
        const recipeId = req.params.id;

        try {
            const recipeToDelete = await recipe.findByPk(recipeId);
            if (recipeToDelete) {
                await recipeToDelete.destroy();
            }
            res.redirect('/main');
        } catch (error) {
            console.error(error);
            res.status(500).send('Error deleting recipe');
        }
    } else {
        res.redirect('/login');
    }
});


app.get('/recipe/:id', async (req, res) => {
    const recipeId = req.params.id;
    try {
        const selectedRecipe = await recipe.findByPk(recipeId);
        if (!selectedRecipe) {
            return res.redirect('/main');
        }
        res.render('inside_recipe', {recipe: selectedRecipe});
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching recipe details');
    }
});


app.get('/create', (req, res) => {
    if (req.isAuthenticated()) {
        res.render('add_recipe');
    } else {
        // If not authenticated, redirect to the login page
        res.redirect('/login');
    }
});


app.get('/main', async (req, res) => {
    try {
        if (req.isAuthenticated()) {
            const recipes = await recipe.findAll();
            res.render('main', {recipes});
        } else {
            // If not authenticated, redirect to the login page
            res.redirect('/login');
        }
    } catch (error) {
        console.error('Error fetching Recipe:', error);
        res.status(500).send('An error occurred while fetching Recipe.');
    }
});


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
