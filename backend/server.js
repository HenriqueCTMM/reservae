const { createApp } = require('./app');

const port = Number(process.env.PORT || 3000);
const app = createApp();
app.listen(port, () => {
    console.log(`Reservaê em http://localhost:${port}`);
});
