const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');



const app = express();
const PORT = 5000;
app.use(cors()); // Agrega esta línea para habilitar CORS

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Conexión a MongoDB Atlas
mongoose
    .connect('mongodb+srv://crisarielnarvaezt:y4ihoenP2kkhoaCN@cluster0.gkbcdzo.mongodb.net/?retryWrites=true&w=majority', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => {
        console.log('Conexión exitosa a MongoDB Atlas');
    })
    .catch((error) => {
        console.error('Error al conectar a MongoDB Atlas:', error);
    });

// Definición del esquema de usuario
const usuarioSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
});

// Modelo de usuario
const Usuario = mongoose.model('Usuario', usuarioSchema);


// Definición del esquema de venta
const ventaSchema = new mongoose.Schema({
    fechaVenta: { type: Date, required: true },
    fechaFin: { type: Date, required: true },
    vendedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    producto: { type: String, required: true },
    monto: { type: Number, required: true },
});

// Modelo de venta
const Venta = mongoose.model('Venta', ventaSchema);

//Ruta para buscar 
// Ruta para buscar el producto más vendido por fecha y vendedor
app.post('/buscar', async (req, res) => {
    const { fechaVenta, fechaFin, vendedor } = req.body;
    console.log('Valores de fecha recibidos:', fechaVenta, fechaFin);
    try {
        await Venta.aggregate([
            {
                $match: {
                    fechaVenta: { $gte: new Date(fechaVenta), $lt: new Date(fechaFin) },
                },
            },
            {
                $group: {
                    _id: '$producto',
                    totalVentas: { $sum: 1 },
                    vendedor: { $first: '$vendedor' },
                },
            },
            {
                $sort: {
                    totalVentas: -1,
                },
            },
            {
                $limit: 1,
            },
        ])
            .then(async (resultados) => {
                if (resultados.length === 0) {
                    return res.status(404).json({ error: 'No se encontraron ventas en el rango de fechas proporcionados' });
                }

                const productoMasVendido = resultados[0]._id;
                const totalVentas = resultados[0].totalVentas;

                // Obtener el nombre del vendedor mediante una consulta adicional
                const vendedorId = resultados[0].vendedor;
                const vendedor = await Usuario.findById(vendedorId, 'nombre');

                res.json({ productoMasVendido, totalVentas, vendedor: vendedor.nombre });
            });
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar el producto más vendido', message: error.message });
    }

});





// Ruta para obtener todos los usuarios
app.get('/usuarios', (req, res) => {
    Usuario.find()
        .then((usuarios) => {
            res.json(usuarios);
        })
        .catch((error) => {
            res.status(500).json({ error: 'Error al obtener los usuarios' });
        });
});

// Ruta para crear un nuevo usuario
app.post('/usuarios', async (req, res) => {
    try {
        const usuario = new Usuario(req.body);
        await usuario.save();
        res.send({ message: 'Usuario creado exitosamente' });
    } catch (error) {
        res.status(500).send(error);

    }
});


// Ruta para obtener todas las ventas
app.get('/ventas', (req, res) => {
    Venta.find()
        .populate('vendedor', 'nombre')
        .then((ventas) => {
            res.json(ventas);
        })
        .catch((error) => {
            res.status(500).json({ error: 'Error al obtener las ventas' });
        });
});

// Ruta para crear una nueva venta
app.post('/ventas', async (req, res) => {
    try {
        const venta = new Venta(req.body);
        await venta.save();
        res.send({ message: 'Venta creada exitosamente' });
    } catch (error) {
        res.status(500).send(error);
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor iniciado en el puerto ${PORT}`);
});
