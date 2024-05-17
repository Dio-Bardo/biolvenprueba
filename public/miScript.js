const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const app = express();
const port = process.env.PORT|| 3000 ;
const dotenv = require("dotenv")
const fs = require('fs').promises;
const multer = require('multer');
dotenv.config()
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));
// Configura tu proyecto Supabase
const SUPABASE_URL = 'https://bxwmuwjokowryjyzwufq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4d211d2pva293cnlqeXp3dWZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxMDQzNDE1MCwiZXhwIjoyMDI2MDEwMTUwfQ.A23skz6US7JSIogCma_7djyPm8_7czNUqDj1l_1RnJ0';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY,);

app.use(express.urlencoded({ extended: true }));

// Configuración de Multers para manejar la carga de archivos
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

// Ruta para cargar archivos al bucket de Supabase
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).send('Debe proporcionar un archivo');
    }

    // Leer el archivo en un Buffer
    const fileContent = await fs.readFile(file.path);

    // Subir el Buffer a Supabase Storage
    const { data, error } = await supabase.storage.from('probando').upload(`archivos/${file.originalname}`, fileContent, {
      contentType: file.mimetype
    });

    if (error) {
      throw error;
    }

    // Obtener la URL del archivo subido
    const url = `https://bxwmuwjokowryjyzwufq.supabase.co/storage/v1/object/public/probando/archivos/${file.originalname}`;

    console.log('Archivo subido exitosamente:', url);
    res.redirect('/multimedia');
  } catch (error) {
    console.error('Error al subir el archivo:', error.message);
    res.send(`
    <script>
      alert('no eres administrador');
      window.location.href = '/multimedia'; // Redirigir a la página principal
    </script>
  `);
  }
});

// Ruta para obtener la lista de archivos de la carpeta 'uploads' en el bucket de Supabase
app.get('/list', async (req, res) => {
  try {
      const { data, error } = await supabase.storage.from('probando').list('archivos/');
      if (error) {
          throw error;
      } else {
          // Enviar la lista de archivos al cliente
          res.json(data);
      }
  } catch (error) {
      console.error('Error al obtener la lista de archivos:', error.message);
      res.status(500).send('Error interno del servidor');
  }
});




app.get("/auth/confirm", async function (req, res) {
  const token_hash = req.query.token_hash;
  const type = req.query.type;
  const next = req.query.next ?? "/";

  if (token_hash && type) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    console.log('token_hash:', token_hash);
    console.log('type:', type);

    if (!error) {
      return res.redirect(303, `/${next.slice(1)}`);
    }
  }

  // Si hay un error o faltan parámetros, redirige a una página de error
  res.redirect(303, '/auth/auth-code-error');
});

async function sendPasswordResetEmail(email) {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:3000/reset-password',
    });
    if (error) {
      throw new Error(error.message);
    }
    console.log('Password reset email sent successfully:', data);
  } catch (error) {
    console.error('Error sending password reset email:', error);
  }
}



// Función para registrar un nuevo usuario
async function register(email,  nombre, nombre_usuario, telefono, ciudad, estado, zona_distribucion, contraseña, apellidos) {
  try {
    // Registra el usuario en Auth de Supabase
    const { user, error } = await supabase.auth.signUp({
      email,
      password : contraseña
    });
    if (error) {
      throw error;
    }
        // Guarda la información adicional en la tabla de usuarios
        const { data, error: insertError } = await supabase
        .from('usuarios')
        .insert([{ email, nombre, apellidos, nombre_usuario, telefono, ciudad, estado, zona_distribucion, contraseña, rol_id: 1 }])
        .single();
      if (insertError) {
        throw insertError;
      }
    console.log('Usuario registrado exitosamente:', user);
    return user;
  } catch (error) {
    console.error('Error al registrar usuario:', error.message);
    return null;
  }
}

app.post('/register', async (req, res) => {
  const { email, nombre, nombre_usuario, telefono, ciudad, estado, zona_distribucion, contraseña, apellidos } = req.body;
  const user = await register(email, nombre, nombre_usuario, telefono, ciudad, estado, zona_distribucion, contraseña, apellidos);

  if (user !== null) {
    // Registro exitoso, mostrar ventana emergente y redirigir a la página principal
    res.send(`
      <script>
        alert('¡Registro exitoso! por favor verifica tu correo.');
        window.location.href = '/'; // Redirigir a la página principal
      </script>
    `);
  } else {
    // Mostrar ventana emergente en caso de error durante el registro
    res.send(`
      <script>
        alert('Error: No se pudo registrar el usuario. Por favor, inténtalo de nuevo.');
        window.location.href = '/register'; // Redirigir de vuelta a la página de registro
      </script>
    `);
  }
});

async function buscarNombrePorCorreoYApellido(email, apellidos) {
  try {
    // Realizar la consulta a la tabla de datos por correo y apellido
    const { data, error } = await supabase
      .from('usuarios')
      .select('contraseña')  // Seleccionar solo el campo 'nombre'
      .eq('email', email)
      .eq('apellidos', apellidos);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('No se encontraron registros con ese correo y apellido');
    }

    const contraseña = data[0].contraseña;  // Obtener el nombre del primer registro encontrado

    console.log(`Su contraseña es: ${contraseña}`);
    return contraseña;
  } catch (err) {
    console.error('Error al buscar por correo y apellido:', err.message);
    throw err;
  }
}
async function login(email, password) {
  try {
    const { user, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    // Aquí puedes realizar otras operaciones después del inicio de sesión
    console.log('Inicio de sesión exitoso:', user);

    return user; // Devuelve el objeto de usuario
  } catch (error) {
    console.error('Error de inicio de sesión:', error.message);
    return null; // Devuelve null en caso de error
  }
}


// Función para cerrar sesión
async function logout() {
  try {
    const { error } = await supabase.auth.signOut();
    userEmailInput = '';
    if (error) {
      throw error;
    }
    console.log('Sesión cerrada exitosamente.');
    return true; // Indicador de éxito al cerrar sesión
  } catch (error) {
    console.error('Error al cerrar sesión:', error.message);
    return false; // Indicador de fallo al cerrar sesión
  }
}

app.post('/editar_usuario', async (req, res) => {
  const { ciudad, estado, zona_distribucion } = req.body;
  const emails = userEmailInput;

  try {
      // Realizar la actualización en la tabla 'usuarios' de Supabase
      const { data, error } = await supabase
          .from('usuarios')
          .update({ ciudad, estado, zona_distribucion })
          .eq('email', emails);

      if (error) {
          throw error;
      }

      res.send('Datos actualizados correctamente.');
  } catch (error) {
      console.error('Error al actualizar datos:', error);
      res.status(500).send('Error al actualizar datos.');
  }
});

app.post('/eliminarRegistro', async (req, res) => {
  try {
    const { fecha, hora, nota } = req.body; // Obtener los datos del cuerpo de la solicitud

    // Consultar la tabla 'calendarios' y eliminar el registro que coincida con los datos recibidos
    const { data, error } = await supabase
      .from('calendarios')
      .delete()
      .eq('fecha', fecha)
      .eq('hora', hora)
      .eq('nota', nota);

    if (error) {
      throw error;
    }

    // Si no hay error, se considera que el registro se eliminó correctamente
    console.log('Registro eliminado:');
    res.status(200).json({ message: 'Registro eliminado exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar el registro:', error.message);
    res.status(500).json({ error: 'Error interno al eliminar el registro.' });
  }
});

app.post('/guardar-fecha', async (req, res) => {
  try {
    const emails = userEmailInput;
    const { fecha, hora, nota } = req.body;

    // Insertar los datos en la tabla de la base de datos de Supabase
    const { data, error } = await supabase
      .from('calendarios')
      .insert([{ fecha, hora, nota, email: emails }])
      .eq('email', emails);


      if (error) {
        throw error;
      }
  
      res.status(200).json({ message: 'Fecha guardada correctamente' });
      
    } catch (error) {
      console.error('Error al guardar la fecha en la base de datos:', error.message);
      res.status(500).json({ error: 'Error al guardar la fecha en la base de datos', errorMessage: error.message });
    }
  });

  app.get('/obtener-fechas', async (req, res) => {
    try {
      const emails = userEmailInput;
  
      if (!userEmail) {
        throw new Error('No se proporcionó un email');
      }
  
      // Consulta para obtener las fechas del usuario
      const { data, error } = await supabase
        .from('calendarios')
        .select('fecha,hora,nota')
        .eq('email', emails);
  
      if (error) {
        throw error;
      }
  
      // Enviar las fechas al cliente en formato JSON
      res.json({ fechas: data });
    } catch (error) {
      console.error('Error al obtener las fechas:', error.message);
      res.status(500).json({ error: 'Error al obtener las fechas del usuario' });
    }
  });
  app.post('/login', async (req, res) => {
    const { email, password } = req.body;
  
    try {
      const user = await login(email, password);
  
      if (user !== null) {
        // Inicio de sesión exitoso
        res.send(`
          <script>
            alert('Inicio de sesión exitoso.');
            window.location.href = '/userData'; // Redirigir a la página principal del usuario
          </script>
        `);
      } else {
        // Inicio de sesión fallido
        res.send(`
          <script>
            alert('Error: Los datos de inicio de sesión son incorrectos.');
            window.location.href = '/login'; // Redirigir de vuelta a la página de inicio de sesión
          </script>
        `);
      }
    } catch (error) {
      console.error('Error al procesar el inicio de sesión:', error);
      res.status(500).send('Error al procesar el inicio de sesión');
    }
  });

  app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
      // Verificar si el correo existe en la base de datos
      const { data: user, error } = await supabase
        .from('usuarios')
        .select('email')
        .eq('email', email)
        .single(); // Suponiendo que cada correo es único en la base de datos
  
      if (error) {
        throw error;
      }
  
      if (!user) {
        // Si el correo no está registrado, enviar mensaje de error
        return res.status(400).send('El correo no está registrado');
      }
  
      // El correo está registrado, enviar correo de restablecimiento
      await sendPasswordResetEmail(email);
      return res.send(`
      <script>
        alert('revise su correo por favor y sigua las instrucciones');
        window.location.href = '/login'; // Redirigir de vuelta a la página de inicio de sesión
      </script>
    `);
    } catch (error) {
      console.error('Error al verificar el correo en la base de datos:', error);
      return res.send(`
      <script>
        alert('Este correo no esta registrado');
        window.location.href = '/login'; // Redirigir de vuelta a la página de inicio de sesión
      </script>
    `);
    }
  });

app.post('/reset-password', async (req, res) => {
  const {email, apellidos} = req.body;
  try {
    const nombre = await buscarNombrePorCorreoYApellido(email, apellidos);
    res.send(`<script>window.open('/login?nombre=${nombre}', '_blank');</script>`);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('/logout', async (req, res) => {
  const logoutSuccess = await logout();

  if (logoutSuccess !== null) {
    if (logoutSuccess) {
      // Sesión cerrada exitosamente
      res.send(`
        <script>
          alert('¡Sesión cerrada exitosamente!');
          window.location.href = '/'; // Redirigir a la página principal
        </script>
      `);
    } else {
      // Error al cerrar sesión
      res.send(`
        <script>
          alert('Error: No se pudo cerrar sesión. Por favor, inténtalo de nuevo.');
          window.location.href = '/'; // Redirigir a la página principal
        </script>
      `);
    }
  } else {
    // El usuario no estaba autenticado, redirigir a la página principal u otra acción
    res.redirect('/');
  }
});

app.get('http://127.0.0.1:5500/login.html', (req, res) => {
  res.sendFile(__dirname + 'http://127.0.0.1:5500/login.html');
});
// jala bien acciones de usuario
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'acciones_usuario.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'iniciarsesion.html'));
});

app.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'forgot-password.html'));
});

app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'reset-password.html'));
});

app.get('/userData', async (req, res) => {
  try {
    // Verificar si el usuario está autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Si el usuario no está autenticado, redirigirlo a la página de inicio de sesión
      res.redirect('/login');
      return;
    }
    console.log('Correo electrónico del usuario:', user.email);

    // El usuario está autenticado, obtener y mostrar los datos del usuario
    const userEmail = user.email; // Obtener el email del usuario autenticado
    const { data, error } = await supabase
      .from('usuarios')
      .select('nombre, nombre_usuario, email, telefono, ciudad, estado, zona_distribucion')
      .eq('email', userEmail)
      .single();

    if (error) {
      throw error;
    }

    // Verificar si se encontraron datos
    if (!data) {
      throw new Error('No se encontraron datos para el usuario.');
    }

    // Mostrar los datos en la consola
    console.log('Datos del usuario:', data);

    // Estructurar la respuesta como una página HTML
    const nombre = data.nombre;
    const nombre_usuario = data.nombre_usuario;
    const email = data.email;
    const telefono = data.telefono;
    const ciudad = data.ciudad;
    const estado = data.estado;
    const zona_distribucion = data.zona_distribucion;
    res.send(`
    <!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BIOLVEN</title>

   <!-- slider stylesheet -->
   <link rel="stylesheet" type="text/css"
   href="https://cdnjs.cloudflare.com/ajax/libs/OwlCarousel2/2.1.3/assets/owl.carousel.min.css" />

 <!-- font awesome style -->
 <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">


 <!-- bootstrap core css -->
 <link rel="stylesheet" type="text/css" href="css/bootstrap.css" />

 <!-- fonts style -->
 <link href="https://fonts.googleapis.com/css?family=Poppins:400,600,700|Roboto:400,700&display=swap" rel="stylesheet">

 <!-- Custom styles for this template -->
 <link href="css/style.css" rel="stylesheet" />
 <!-- responsive style -->
 <link href="css/responsive.css" rel="stylesheet" />
<body>
  <div class="hero_area3">
    <!-- header section strats -->
    <header class="header_section">
      <div class="container">
        <div class="top_contact-container">
          <div class="tel_container">
            <a href="">

            </a>
          </div>
          <div class="social-container">
            <a href="https://www.facebook.com/biolvenlab">
              <img src="images/fb.png" alt="" class="s-1">
            </a>
            <a href="#" onclick="openWhatsAppChat();">
              <img src="images/telephone-symbol-button.png" alt="" class="s-2">
            </a>
            <a href="https://www.instagram.com/biolvenlab/" target="_blank">
              <img src="images/instagram.png" alt="" class="s-3">
            </a>
          </div>
        </div>
      </div>
      <div class="container-fluid">
        <nav class="navbar navbar-expand-lg custom_nav-container pt-3">
          <a class="navbar-brand" href="login.html">
            <img src="images/Logo_Mesa_de_trabajo_1.png" alt="">
            <span>
              BIOLVEN
            </span>
          </a>
          <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent"
            aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
          </button>

          <div class="collapse navbar-collapse" id="navbarSupportedContent">
            <div class="d-flex  flex-column flex-lg-row align-items-center w-100 justify-content-between">
              <ul class="navbar-nav  ">
                <li class="nav-item active">
                  <a class="nav-link" href="login.html">Inicio <span class="sr-only">(current)</span></a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" href="sobrenosotros.html"> Sobre nosotros </a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" href="productos.html"> Productos </a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" href="/multimedia"> Noticias </a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" href="contact.html">Contacto</a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" href="/userDataCalendario">Calendario</a>
                </li>
                <li class="nav-item">
                 <a class="nav-link" href="directorio.html">Directorio</a>
               </li>
               <li class="nav-item">
               <a class="nav-link" href="/userData">Usuario</a>
               </li>
              </ul>
                  <div class="login_btn-contanier ml-0 ml-lg-5">
                    <a href="/">
                      <img src="images/user.png" alt="">
                      <span>
                        Login
                      </span>
                </a>
              </div>
            </div>
          </div>

        </nav>
      </div>
    </header>
    <main>
    <!-- Contenido del usuario -->
    <div class="container mt-5">
        <div class="row justify-content-center">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        Menú del Usuario
                    </div>
                    <div class="card-body">
                        <h5 class="card-title">Bienvenido, ${nombre_usuario}</h5>
                        <ul class="list-group">
                            <li class="list-group-item">
                                <strong>Nombre:</strong>
                                <div class="form-group mt-2">
                                    <input type="text" class="form-control" id="nombre" placeholder="${nombre}" disabled>
                                </div>
                            </li>
                            <li class="list-group-item">
                                <strong>Nombre de Usuario:</strong>
                                <div class="form-group mt-2">
                                    <input type="text" class="form-control" id="nombre_usuario" placeholder="${nombre_usuario}" disabled>
                                </div>
                            </li>
                            <li class="list-group-item">
                                <strong>Correo Electrónico:</strong>
                                <div class="form-group mt-2">
                                    <input type="email" class="form-control" id="email" placeholder="${email}" disabled>
                                </div>
                            </li>
                            <li class="list-group-item">
                                <strong>Número de Teléfono:</strong>
                                <div class="form-group mt-2">
                                    <input type="tel" class="form-control" id="telefono" placeholder="${telefono}" disabled>
                                </div>
                            </li>
                            <li class="list-group-item">
                                <strong>Ciudad:</strong>
                                <div class="form-group mt-2">
                                    <input type="text" class="form-control" id="ciudad" placeholder="${ciudad}" disabled>
                                </div>
                            </li>
                            <li class="list-group-item">
                                <strong>Estado:</strong>
                                <div class="form-group mt-2">
                                    <input type="text" class="form-control" id="estado" placeholder="${estado}" disabled>
                                </div>
                            </li>
                            <li class="list-group-item">
                                <strong>Zona de Distribución:</strong>
                                <div class="form-group mt-2">
                                    <input type="text" class="form-control" id="zona_distribucion" placeholder="${zona_distribucion}" disabled>
                                </div>
                            </li>
                        </ul>

                        <button class="btn btn-primary mt-3" id="editBtn">Editar Datos</button>

                    </div>
                </div>
            </div>
        </div>
    </div>
</main>
  </div>
  <!-- info section -->
  <section class="info_section layout_padding2">
    <div class="container">
      <div class="row">
        <div class="col-md-3">
          <div class="info_contact">
            <h4>
              Contacto
            </h4>
            <div class="box">
              <div class="img-box">
                <img src="images/telephone-ssymbol-button.png" alt="">
              </div>
              <div class="detail-box">
                <h6>
                  +52 4771546115
                </h6>
                <h6>
                  +52 4791373460
                </h6>
              </div>
            </div>
            <div class="box">
              <div class="img-box">
                <br>
                <br>
                <br>
                <img src="images/email.png" alt="">
              </div>
              <div class="detail-box">
                <br>
                <br>
                <br>
                <h6>
                  ramonangelserrano@gmail.com
                </h6>
                <h6>
                  nilapedroxn6@gmail.com
                </h6>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="info_menu">
            <h4>
              Menu
            </h4>
            <ul class="navbar-nav  ">
              <li class="nav-item active">
                <a class="nav-link" href="index.html">Inicio <span class="sr-only">(current)</span></a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="sobrenosotros.html"> Sobre nosotros </a>
              </li>
            </ul>
          </div>
        </div>
        <div class="col-md-6">
          <div class="info_news">
            <h4>
              Suscribcciones
            </h4>
            <form action="https://formsubmit.co/biolvenproveedores@gmail.com" method="POST">
            <input type="hidden" name="_subject" value="Nuevo suscriptor - Deseo suscribirme y recibir notificaciones">
            <input type="hidden" name="_template" value="table">
            <input type="hidden" name="_autoresponse" value="Gracias por suscribirte. Pronto recibirás nuestras notificaciones.">
            <input type="email" name="email" placeholder="Ingresa tu correo" required>
            <div class="d-flex justify-content-center justify-content-end mt-3">
              <button type="submit">Suscribirme</button>
            </div>
          </form>
          </div>
        </div>
      </div>
    </div>
  </section>


  <!-- end info section -->

  <!-- footer section -->
  <section class="container-fluid footer_section">
    <p>
      &copy; 2024 todos los derechos reservados. por 
      <a href="https://html.design/">Biolven develops</a>
    </p>
  </section>
  <!-- footer section -->

  <script type="text/javascript" src="js/jquery-3.4.1.min.js"></script>
  <script type="text/javascript" src="js/bootstrap.js"></script>
  <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/OwlCarousel2/2.2.1/owl.carousel.min.js">
  </script>
  <script type="text/javascript">
    $(".owl-carousel").owlCarousel({
      loop: true,
      margin: 10,
      nav: true,
      navText: [],
      autoplay: true,
      responsive: {
        0: {
          items: 1
        },
        600: {
          items: 2
        },
        1000: {
          items: 4
        }
      }
    });
  </script>
  <script type="text/javascript">
    $(".owl-2").owlCarousel({
      loop: true,
      margin: 10,
      nav: true,
      navText: [],
      autoplay: true,

      responsive: {
        0: {
          items: 1
        },
        600: {
          items: 2
        },
        1000: {
          items: 4
        }
      }
    });
  </script>
<script type="text/javascript">
  // Función para mostrar la imagen seleccionada en el campo de carga de foto de perfil
  document.addEventListener('DOMContentLoaded', function() {
    var editBtn = document.getElementById('editBtn');
    if (editBtn) {
        editBtn.addEventListener('click', function() {
            var ciudadInput = document.getElementById('ciudad');
            var estadoInput = document.getElementById('estado');
            var zona_distribucionInput = document.getElementById('zona_distribucion');

            // Habilitar/deshabilitar la edición de los campos específicos
            ciudadInput.disabled = !ciudadInput.disabled;
            estadoInput.disabled = !estadoInput.disabled;
            zona_distribucionInput.disabled = !zona_distribucionInput.disabled;

            // Cambiar el texto del botón según el estado de edición
            if (ciudadInput.disabled) {
                editBtn.textContent = 'Editar Datos';
                // Enviar los datos editados al servidor
                guardarDatosEditados(ciudadInput.value, estadoInput.value, zona_distribucionInput.value);
            } else {
                editBtn.textContent = 'Guardar Datos';
            }
        });
    }

    var fotoPerfilInput = document.getElementById('fotoPerfil');
    if (fotoPerfilInput) {
        fotoPerfilInput.addEventListener('change', function() {
            var previewImage = document.getElementById('previewImage');
            var file = this.files[0];
            var reader = new FileReader();
            reader.onload = function() {
                previewImage.src = reader.result;
                document.getElementById('fotoPerfilStatus').textContent = 'Imagen cargada';
            }
            if (file) {
                reader.readAsDataURL(file);
            }
        });
    }

    var eliminarFotoBtn = document.getElementById('eliminarFotoBtn');
    if (eliminarFotoBtn) {
        eliminarFotoBtn.addEventListener('click', function() {
            var previewImage = document.getElementById('previewImage');
            previewImage.src = '#';
            document.getElementById('fotoPerfil').value = ''; // Limpiar el campo de carga de foto de perfil
            document.getElementById('fotoPerfilStatus').textContent = ''; // Limpiar el estado de la foto de perfil
        });
    }
});
function guardarDatosEditados(ciudad, estado, zona_distribucion) {
  // Verificar que los campos requeridos no estén vacíos
  if (!ciudad || !estado || !zona_distribucion) {
    alert('Por favor, llene todos los campos.');
    window.location.href = window.location.href;
    window.location.reload();
    return; // Salir de la función sin enviar la solicitud al servidor
  } else {
    fetch('/editar_usuario', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ciudad, estado, zona_distribucion })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Error al guardar los datos.');
      }
      return response.json();
    })
    .then(data => {
      console.log('Datos guardados correctamente:', data);
      // Mostrar una alerta de éxito
      alert('Los datos se han cargado correctamente.');
      // Puedes realizar alguna acción adicional aquí si lo necesitas
      window.location.href = window.location.href;
      window.location.reload();
    })
    .catch(error => {
      console.error('Error al guardar los datos:', error);
      // Puedes mostrar un mensaje de error al usuario o manejar la situación de otra manera
      alert('Los datos se han cargado correctamente.');
      window.location.href = window.location.href;
      window.location.reload();
    });
  }
}
  // Función para eliminar la foto de perfil
  document.getElementById('eliminarFotoBtn').addEventListener('click', function() {
      var previewImage = document.getElementById('previewImage');
      previewImage.src = '#';
      document.getElementById('fotoPerfil').value = ''; // Limpiar el campo de carga de foto de perfil
      document.getElementById('fotoPerfilStatus').textContent = ''; // Limpiar el estado de la foto de perfil
  });
</script>
</body>

</html>
    `);
  } catch (error) {
    // Manejar la excepción aquí
    console.error('Error al obtener los datos del usuario:', error);
    res.status(500).send(`
      <script>
        alert('Error al obtener los datos del usuario. Por favor, inicia sesión para acceder a esta información.');
        window.location.href = '/'; // Redirigir a la página principal
      </script>
    `);
  }
});

app.get('/userDataCalendario', async (req, res) => {
  try {
    // Verificar si el usuario está autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Si el usuario no está autenticado, redirigirlo a la página de inicio de sesión
      res.redirect('/login');
      return;
    }
    console.log('Correo electrónico del usuario:', user.email);
    const userEmail = user.email;
    // Consulta para obtener los datos del usuario utilizando el email

    const { data, error } = await supabase
    .from('calendarios')
    .select('email, fecha, nota, hora')
    .eq('email', userEmail)
    .order('fecha', { ascending: true });

    if (error) {
      throw error;
    }

    // Verificar si se encontraron datos
    if (!data || data.length === 0) {
      throw new Error('No se encontraron datos para el usuario.');
    }

    // Mostrar los datos en la consola
    console.log('Datos del usuario:', data);

    // Estructurar la respuesta como una página HTML
    let fechasHTML = '';
    data.forEach(({ fecha, nota, hora }, index) => {
      fechasHTML += `
        <div class="fecha-agregada">
          <p class="fecha-hora">Fecha: ${fecha} - Hora: ${hora}</p>
          <p class="nota">Nota: ${nota}</p>
          <button onclick="eliminarRegistro(${index}, '${fecha}', '${hora}', '${nota}')" class="btn btn-danger">Eliminar</button>
        </div>
        <hr>`; // Agregar un separador después de cada registro
    });

    const htmlResponse = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Calendario</title>
    
       <!-- slider stylesheet -->
       <link rel="stylesheet" type="text/css"
       href="https://cdnjs.cloudflare.com/ajax/libs/OwlCarousel2/2.1.3/assets/owl.carousel.min.css" />
    
     <!-- font awesome style -->
     <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
    
    
     <!-- bootstrap core css -->
     <link rel="stylesheet" type="text/css" href="css/bootstrap.css" />
    
     <!-- fonts style -->
     <link href="https://fonts.googleapis.com/css?family=Poppins:400,600,700|Roboto:400,700&display=swap" rel="stylesheet">
    
     <!-- Custom styles for this template -->
     <link href="css/style.css" rel="stylesheet" />
     <!-- responsive style -->
     <link href="css/responsive.css" rel="stylesheet" />
    </head>
    
    <body>
      <div class="hero_area">
        <!-- header section strats -->
        <header class="header_section">
          <div class="container">
            <div class="top_contact-container">
              <div class="tel_container">
                <a href="">
                </a>
              </div>
              <div class="social-container">
                <a href="https://www.facebook.com/biolvenlab" target="_blank">
                  <img src="images/fb.png" alt="" class="s-1">
                </a>
                <a href="#" onclick="openWhatsAppChat();">
                  <img src="images/telephone-symbol-button.png" alt="" class="s-2">
                </a>
                <a href="https://www.instagram.com/biolvenlab/" target="_blank">
                  <img src="images/instagram.png" alt="" class="s-3">
                </a>
              </div>
            </div>
          </div>
         <div class="container-fluid">
           <nav class="navbar navbar-expand-lg custom_nav-container pt-3">
             <a class="navbar-brand" href="login.html">
               <img src="images/Logo_Mesa_de_trabajo_1.png" alt="">
               <span>
                 BIOLVEN
               </span>
             </a>
             <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent"
               aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
               <span class="navbar-toggler-icon"></span>
             </button>
    
             <div class="collapse navbar-collapse" id="navbarSupportedContent">
               <div class="d-flex  flex-column flex-lg-row align-items-center w-100 justify-content-between">
               <ul class="navbar-nav  ">
               <li class="nav-item active">
                 <a class="nav-link" href="login.html">Inicio <span class="sr-only">(current)</span></a>
               </li>
               <li class="nav-item">
                 <a class="nav-link" href="sobrenosotros.html"> Sobre nosotros </a>
               </li>
               <li class="nav-item">
                 <a class="nav-link" href="productos.html"> Productos </a>
               </li>
               <li class="nav-item">
                 <a class="nav-link" href="/multimedia"> Noticias </a>
               </li>
               <li class="nav-item">
                 <a class="nav-link" href="contact.html">Contacto</a>
               </li>
               <li class="nav-item">
                 <a class="nav-link" href="/userDataCalendario">Calendario</a>
               </li>
               <li class="nav-item">
                <a class="nav-link" href="directorio.html">Directorio</a>
              </li>
              <li class="nav-item">
              <a class="nav-link" href="/userData">Usuario</a>
              </li>
             </ul>
                 <div class="login_btn-contanier ml-0 ml-lg-5">
                   <a href="/">
                     <img src="images/user.png" alt="">
                     <span>
                       Login
                     </span>
                   </a>
                 </div>
               </div>
             </div>
           </nav>
         </div>
       </header>
       <main>
        <div class="container mt-5">
            <div class="row justify-content-center">
              <div class="col-md-6">
                <div class="card">
                  <div class="card-header">
                    Selección de Fecha y Hora
                  </div>
                  <div class="card-body">
                    <form>
                      <div class="form-group">
                        <label for="fecha">Fecha <span style="color: red;">*</span></label>
                        <input type="date" class="form-control" id="fecha" required>
                        <small id="fecha" class="form-text text-muted">* Seleccione una fecha dando click en el icono.</small>
                      </div>
                      <div class="form-group">
                        <label for="hora">Hora <span style="color: red;">*</span> </label>
                        <input type="time" class="form-control" id="hora" required>
                        <small id="hora" class="form-text text-muted">Formato de 24 horas ejemplo= (13:30).</small>
                      </div>
                      <div class="form-group">
                        <label for="nota">Nota  <span style="color: red;">*</span></label>
                        <input type="text" class="form-control" id="nota" required>
                        <small id="nota" class="form-text text-muted">* Ingresa una nota para la fecha seleccionada.</small>
                      </div>
                      <button type="button" class="btn btn-primary" onclick="agregarFechaNota()">Agregar Fecha y Nota</button>
                    </form>
                  </div>
                </div>
              </div>
              <div class="col-md-6">
                <div class="card">
                  <div class="card-header">
                    Fechas Agregadas
                  </div>
                  <div class="card-body" id="fechasAgregadas">
                  ${fechasHTML}
                    <!-- Aquí se mostrarán las fechas y notas -->
                  </div>
                </div>
              </div>
            </div>
        </div>
      </main>
    
      <!-- Modal de confirmación de eliminación -->
      <div class="modal fade" id="confirmacionEliminarModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="exampleModalLabel">Confirmación de Eliminación</h5>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">
              ¿Estás seguro de que quieres eliminar esta fecha? No podrás recuperarla una vez borrada.
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-danger" id="confirmarEliminarBtn" data-id="">Borrar</button>
            </div>
          </div>
        </div>
      </div>
    
      <!-- info section -->
      <section class="info_section layout_padding2">
        <div class="container">
          <div class="row">
            <div class="col-md-3">
              <div class="info_contact">
                <h4>
                  Contacto
                </h4>
                <div class="box">
                  <div class="img-box">
                    <img src="images/telephone-symbol-button.png" alt="">
                  </div>
                  <div class="detail-box">
                    <h6>
                      +52 4771546115
                    </h6>
                    <h6>
                      +52 4791373460
                    </h6>
                  </div>
                </div>
                <div class="box">
                  <div class="img-box">
                    <br>
                    <br>
                    <br>
                    <img src="images/email.png" alt="">
                  </div>
                  <div class="detail-box">
                    <br>
                    <br>
                    <br>
                    <h6>
                      ramonangelserrano@gmail.com
                    </h6>
                    <h6>
                      nilapedroxn6@gmail.com
                    </h6>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="info_menu">
                <h4>
                  Menu
                </h4>
                <ul class="navbar-nav  ">
                  <li class="nav-item active">
                    <a class="nav-link" href="index.html">Inicio <span class="sr-only">(current)</span></a>
                  </li>
                  <li class="nav-item">
                    <a class="nav-link" href="sobrenosotros.html"> Sobre nosotros </a>
                  </li>
                </ul>
              </div>
            </div>
            <div class="col-md-6">
              <div class="info_news">
                <h4>
                  Suscripciones
                </h4>
                <form action="https://formsubmit.co/biolvenproveedores@gmail.com" method="POST">
                <input type="hidden" name="_subject" value="Nuevo suscriptor - Deseo suscribirme y recibir notificaciones">
                <input type="hidden" name="_template" value="table">
                <input type="hidden" name="_autoresponse" value="Gracias por suscribirte. Pronto recibirás nuestras notificaciones.">
                <input type="email" name="email" placeholder="Ingresa tu correo" required>
                <div class="d-flex justify-content-center justify-content-end mt-3">
                  <button type="submit">Suscribirme</button>
                </div>
              </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    
    
      <!-- end info section -->
    
      <!-- footer section -->
      <section class="container-fluid footer_section">
        <p>
          &copy; 2024 todos los derechos reservados. por 
          <a href="https://html.design/">Biolven develops</a>
        </p>
      </section>
      <!-- footer section -->
    
      <script>
        // Función para agregar una nueva fecha y nota
        function agregarFechaNota() {
      // Obtener los valores de la fecha, hora y la nota
      var fecha = document.getElementById('fecha').value;
      var hora = document.getElementById('hora').value || 'No especificada';
      var nota = document.getElementById('nota').value;
    
      // Validar que se haya ingresado una fecha y una nota
      if (fecha && nota) {
        // Crear un objeto con los datos a enviar al servidor
    
        // Enviar los datos al servidor
        fetch('/guardar-fecha', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fecha, hora, nota })
        })
          .then(response => {
            if (!response.ok) {
              throw new Error('Por favor llene todos los campos obligatorios.');
            }
            return response.json();
          })
          .then(data => {
            alert(data.message);
            // Limpiar los campos de fecha y nota después de agregar
            document.getElementById('fecha').value = '';
            document.getElementById('hora').value = '';
            document.getElementById('nota').value = '';
            window.location.reload();
          })
          .catch(error => {
            console.error('Error:', error);
            alert('Por favor llene todos los campos obligatorios.');
          });
      } else {
        alert('Por favor llene todos los campos obligatorios.');
      }
    }
    
    
        // Evento clic para el botón de confirmación de eliminación
        document.getElementById('confirmarEliminarBtn').addEventListener('click', function() {
          // Obtener el identificador de la fecha a eliminar
          var fechaId = this.getAttribute('data-id');
    
          // Eliminar la fecha
          eliminarFecha(fechaId);
        });
      </script>

      <script>
      function eliminarRegistro(index, fecha, hora, nota) {
        // Mostrar modal de confirmación antes de eliminar
        $('#confirmacionEliminarModal').modal('show');
    
        // Configurar el evento clic para el botón de confirmación en el modal
        $('#confirmarEliminarBtn').off('click').on('click', function() {
          // Cerrar el modal de confirmación
          $('#confirmacionEliminarModal').modal('hide');
    
          // Llamar a la función para confirmar la eliminación
          confirmarEliminacion(index, fecha, hora, nota);
        });
      }
    
      function confirmarEliminacion(index, fecha, hora, nota) {
        // Crear un objeto con los datos a enviar al servidor
        const data = { index, fecha, hora, nota };
    
        // Enviar los datos al servidor
        fetch('/eliminarRegistro', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        })
        .then(response => {
          if (!response.ok) {
            throw new Error('Error al eliminar el registro');
          }
          return response.json();
        })
        .then(data => {
          console.log('Registro eliminado:', data);
          window.location.reload();
          // Aquí puedes realizar acciones adicionales si es necesario
        })
        .catch(error => {
          console.error('Error al eliminar el registro:', error);
        });
      }
    </script>
      <script>
        function openWhatsAppChat() {
          var phoneNumber = '+524771546115'; // Reemplaza con tu número de teléfono
          var message = 'Hola, estoy visitando tu sitio web.'; // Mensaje predeterminado opcional
    
          // Construye la URL del enlace de WhatsApp
          var whatsappURL = 'https://wa.me/' + phoneNumber + '?text=' + encodeURIComponent(message);
    
          // Abre una nueva ventana con el enlace de WhatsApp
          window.open(whatsappURL, '_blank', 'width=600,height=400,scrollbars=yes');
        }
      </script>
    
      <!-- jQuery, Popper.js, Bootstrap JS -->
      <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.5.4/dist/umd/popper.min.js"></script>
      <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/js/bootstrap.min.js"></script>
    </body>
    </html> 
    `;
    res.send(htmlResponse);
  } catch (error) {
    // Manejar la excepción aquí
    console.error('Error al obtener los datos del usuario:', error);
    res.status(500).send(`
      <script>
        alert('Error al obtener los datos del usuario. Por favor, inicia sesión para acceder a esta información.');
        window.location.href = '/'; // Redirigir a la página principal
      </script>
    `);
  }
});

app.get('/multimedia', async (req, res) => {
  try {
    // Verificar si el usuario está autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Si el usuario no está autenticado, redirigirlo a la página de inicio de sesión
      res.status(500).send(`
      <script>
        alert('Error al obtener los datos del usuario. Por favor, inicia sesión para acceder a esta información.');
        window.location.href = '/'; // Redirigir a la página principal
      </script>
    `);
      return;
    }
    console.log('Correo electrónico del usuario:', user.email);

    // El usuario está autenticado, obtener y mostrar los datos del usuario
    const userEmail = user.email; // Obtener el email del usuario autenticado
    const { data, error } = await supabase
      .from('usuarios')
      .select(' email ')
      .eq('email', userEmail)
      .single();

    if (error) {
      throw error;
    }

    // Verificar si se encontraron datos
    if (!data) {
      throw new Error('No se encontraron datos para el usuario.');
    }

    // Mostrar los datos en la consola
    console.log('Datos del usuario:', data);

    res.sendFile(path.join(__dirname, 'multimedia.html'));
  } catch (error) {
    // Manejar la excepción aquí
    console.error('Error al obtener los datos del usuario:', error);
    res.status(500).send(`
      <script>
        alert('Error al obtener los datos del usuario. Por favor, inicia sesión para acceder a esta información.');
        window.location.href = '/'; // Redirigir a la página principal
      </script>
    `);
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
