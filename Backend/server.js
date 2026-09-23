require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const app = require('./src/app')
const connecttodb= require('./config/database')
const { initEmail } = require('./services/email.service')

const PORT = process.env.PORT || 3000

connecttodb();
initEmail(); // checks Gmail credentials once; email is skipped (not fatal) if they're broken

app.listen(PORT,()=>{
    console.log(`server is running on port ${PORT}`)
})
