const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const port = 3000;

// Configuración de Multer para manejar la carga de archivos
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024 // Limitar tamaño de archivo a 50MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('El archivo no es una imagen o video válido'));
    }
  }
});

// Configuración de Supabase
const supabaseUrl = 'https://bxwmuwjokowryjyzwufq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4d211d2pva293cnlqeXp3dWZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxMDQzNDE1MCwiZXhwIjoyMDI2MDEwMTUwfQ.A23skz6US7JSIogCma_7djyPm8_7czNUqDj1l_1RnJ0';
const supabase = createClient(supabaseUrl, supabaseKey);

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Ruta para manejar la carga de archivos desde la computadora
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).send('Debe proporcionar un archivo');
    }

    // Leer el archivo en un Buffer
    const fileContent = await fs.readFile(file.path);

    // Subir el Buffer a Supabase Storage
    const { data, error } = await supabase.storage.from('archivos').upload(`uploads/${file.originalname}`, fileContent, {
      contentType: file.mimetype
    });

    if (error) {
      throw error;
    }

    // Obtener la URL del archivo subido
    const url = `https://bxwmuwjokowryjyzwufq.supabase.co/storage/v1/object/public/archivos/uploads/${file.originalname}`;

    console.log('Archivo subido exitosamente:', url);
    res.redirect('/');
  } catch (error) {
    console.error('Error al subir el archivo:', error.message);
    res.status(500).send('Error interno del servidor');
  }
});

// Ruta para mostrar el formulario de carga
app.get('/', async (req, res) => {
  res.send(`
    <h1>Subir Archivos</h1>
    <form action="/upload" method="post" enctype="multipart/form-data">
      <input type="file" name="file">
      <button type="submit">Subir Archivo</button>
    </form>
  `);
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor en ejecución en http://localhost:${port}`);
});