const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = 3000;

// Configura Supabase
const supabaseUrl = 'https://bxwmuwjokowryjyzwufq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4d211d2pva293cnlqeXp3dWZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxMDQzNDE1MCwiZXhwIjoyMDI2MDEwMTUwfQ.A23skz6US7JSIogCma_7djyPm8_7czNUqDj1l_1RnJ0';
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware para manejar JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta para guardar la fecha en la base de datos
app.post('/guardar-fecha', async (req, res) => {
  try {
    const { fecha, hora, nota, uid } = req.body;

    // Insertar los datos en la tabla de la base de datos de Supabase
    const { data, error } = await supabase
      .from('calendario')
      .insert([{ fecha, hora, nota, user_id: uid }]);

    if (error) {
      throw error;
    }

    res.status(200).json({ message: 'Fecha guardada correctamente' });
  } catch (error) {
    console.error('Error al guardar la fecha en la base de datos:', error.message);
    res.status(500).json({ error: 'Error al guardar la fecha en la base de datos' });
  }
});

// Ruta para servir el HTML del calendario
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Calendario</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
      <style>
        /* Estilos CSS para el calendario */
        /* Puedes personalizar estos estilos según tus preferencias */
        body {
          font-family: Arial, sans-serif;
        }
        .calendar {
          width: 300px;
          margin: 0 auto;
          text-align: center;
        }
        .month {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 5px;
        }
        .day {
          padding: 5px;
          border: 1px solid #ccc;
        }
        .day:hover {
          background-color: #f0f0f0;
          cursor: pointer;
        }
        .form-group {
          margin-bottom: 15px;
        }
        .btn {
          padding: 8px 16px;
          border: none;
          background-color: #007bff;
          color: #fff;
          cursor: pointer;
        }
        .btn:hover {
          background-color: #0056b3;
        }
      </style>
    </head>
    <body>
      <div class="calendar">
        <div class="month">
          <i class="fas fa-angle-left"></i>
          <div>Mayo 2024</div>
          <i class="fas fa-angle-right"></i>
        </div>
        <div class="days">
          <div class="day">Lun</div>
          <div class="day">Mar</div>
          <div class="day">Mié</div>
          <div class="day">Jue</div>
          <div class="day">Vie</div>
          <div class="day">Sáb</div>
          <div class="day">Dom</div>
        </div>
      </div>
      <form id="notaForm">
        <div class="form-group">
          <label for="fecha">Fecha:</label>
          <input type="date" id="fecha" name="fecha" required>
        </div>
        <div class="form-group">
          <label for="hora">Hora:</label>
          <input type="time" id="hora" name="hora">
        </div>
        <div class="form-group">
          <label for="nota">Nota:</label>
          <textarea id="nota" name="nota" rows="4" required></textarea>
        </div>
        <input type="hidden" id="uid" name="uid" value="baf33308-fef6-4b96-9e7c-fccf60e97b29">
        <button type="submit" class="btn">Guardar</button>
      </form>
      <script>
        // Manejo del formulario de la nota
        document.getElementById('notaForm').addEventListener('submit', async (event) => {
          event.preventDefault();

          const formData = new FormData(event.target);
          const formDataObject = Object.fromEntries(formData.entries());

          try {
            const response = await fetch('/guardar-fecha', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(formDataObject),
            });

            if (!response.ok) {
              throw new Error('Error al guardar la fecha en la base de datos');
            }

            const data = await response.json();
            alert(data.message);
          } catch (error) {
            console.error('Error:', error);
            alert('Error al guardar la fecha en la base de datos');
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Inicia el servidor
app.listen(port, () => {
  console.log(`Servidor Express corriendo en http://localhost:${port}`);
});