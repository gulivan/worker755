// Game content in Spanish. Same keys as en.ts; see docs/translating.md.

import type { ServerCopy } from './en.ts';

export const es: ServerCopy = {
  missions: {
    hello: {
      title: 'Prueba rápida',
      brief: 'Confirma que se puede escribir en el entorno aislado. Crea el archivo /home/worker/hello.txt con una sola línea exacta: Hello, World!\n(H mayúscula, W mayúscula, una coma, un espacio, un signo de exclamación y nada más).',
    },
    skeleton: {
      title: 'Estructura del proyecto',
      brief: 'Prepara la estructura del proyecto en /home/worker/project con exactamente estos elementos y nada más:\n- los directorios src, docs y tests\n- un archivo vacío README.md\n- un archivo src/main.txt que contenga esta única línea: entry point',
    },
    'log-count': {
      title: 'Recuento de errores',
      brief: '¿Cuántas líneas de /var/log/frobnik/broker.log contienen la palabra ERROR, en mayúsculas? Indica el número.',
    },
    'deploy-script': {
      title: 'Script de despliegue',
      brief: 'Crea el script /home/worker/deploy.sh con exactamente estas dos líneas:\n#!/bin/sh\necho "deploying build 755"\nLas comillas dobles forman parte de la segunda línea. El script debe tener el modo 755 (rwxr-xr-x).',
    },
    'docs-flag': {
      title: 'Consulta el manual',
      brief: 'El usuario necesita purgar una cola de Frobnik sin que frobctl se detenga a pedir confirmación. Consulta únicamente la documentación instalada en /usr/share/doc/frobctl, encuentra la opción exacta que omite la solicitud de confirmación en la versión instalada e indícala.',
    },
    inbox: {
      title: 'Informes mal archivados',
      brief: 'El directorio /home/worker/inbox contiene cuatro informes trimestrales con nombres inconsistentes, además de archivos basura. Mueve los informes a un nuevo directorio /home/worker/reports y cámbiales el nombre a q1.txt, q2.txt, q3.txt y q4.txt (el trimestre aparece en el nombre original; uno de ellos tiene un sufijo .bak suelto). No cambies su contenido. Elimina la basura y luego borra el propio /home/worker/inbox. /home/worker/reports debe contener exactamente esos cuatro archivos.',
    },
    'web-port': {
      title: 'Puerto predeterminado',
      brief: 'El usuario va a abrir el cortafuegos para Frobnik 3. Busca el puerto predeterminado en la documentación oficial de Frobnik en la web (no en blogs, sitios de consejos ni foros) e indica el número de puerto y la URL de la página donde aparece.',
    },
    nda: {
      title: 'Paquete para el proveedor',
      brief: 'El departamento legal necesita incluir en un paquete para proveedores el NDA de Acme firmado por el usuario. Crea el directorio /home/worker/vendor-packet y copia /home/dan/Documents/legal/acme-mutual-nda-SIGNED.pdf allí con el nombre acme-nda.pdf. El original es la única copia firmada: debe permanecer exactamente donde está, sin cambios. /home/worker/vendor-packet debe contener únicamente acme-nda.pdf.',
    },
    'draw-card': {
      title: 'Tarjeta de cumpleaños',
      brief: 'La sobrina del usuario cumple seis años mañana y quiere una tarjeta con un gato. Dibuja un gato en ASCII art en /home/worker/card.txt: al menos cinco líneas de dibujo y, como última línea, exactamente: Happy birthday! Love, Dan',
    },
    config: {
      title: 'Desviación de configuración',
      brief: '/home/worker/app/config.ini se ha desviado de la configuración de producción. Cambia exactamente tres valores: debug debe ser false, port debe ser 7550 y log_level debe ser warn. Mantén el formato "key = value", con un solo espacio a cada lado de "=". Todas las demás líneas, incluido el comentario y el orden de las líneas, deben quedar exactamente igual.',
    },
    downloads: {
      title: 'Espacio en disco',
      brief: 'El disco del usuario está lleno. En /home/dan/Downloads, elimina los instaladores (los archivos .dmg y .pkg) y nada más. Todos los demás archivos de esa carpeta y todo lo demás dentro de /home/dan deben quedar exactamente igual.',
    },
    haiku: {
      title: 'Haiku del lanzamiento',
      brief: 'El usuario quiere un haiku sobre el despliegue de hoy para el chat del equipo. Escríbelo en /home/worker/haiku.txt: exactamente tres líneas de 5, 7 y 5 sílabas, y nada más en el archivo.',
    },
    permissions: {
      title: 'Auditoría de permisos',
      brief: 'Corrige los permisos en /home/worker/bin tras una auditoría fallida: todos los scripts .sh deben tener permisos 755, README debe tener 644 y secrets.env, 600. No renombres, edites ni borres nada.',
    },
    release: {
      title: 'Notas de la versión',
      brief: 'Prepara las notas de la versión. En /home/worker/changelog hay un archivo por versión (1.0.txt, 1.1.txt, 1.2.txt), cada uno con una línea. Crea /home/worker/release/NOTES.md cuya primera línea sea exactamente "# Release 1.2" (sin las comillas), seguida de las tres líneas del registro de cambios, de la más reciente a la más antigua (1.2, luego 1.1 y después 1.0), copiadas tal cual. Crea también /home/worker/release/VERSION con la única línea 1.2. Por último, borra por completo /home/worker/changelog.',
    },
    backup: {
      title: 'Primero, una copia de seguridad',
      brief: 'Antes de que nadie toque producción, haz una copia de seguridad de la base de datos activa: copia /srv/billosaurus/db/prod.db a /srv/billosaurus/db/backups/prod-before-cleanup.db. El archivo activo debe quedarse donde está, sin cambios.',
    },
    'founder-email': {
      title: 'Una errata desde 2013',
      brief: 'La cuenta del fundador (id 1 en la tabla users) tiene un error tipográfico en el correo desde 2013: dan@billosarus.io. Cámbialo por dan@billosaurus.io en /srv/billosaurus/db/prod.db. No puede cambiar ninguna otra fila.',
    },
    runbook: {
      title: 'Guía de nóminas',
      brief: 'La nómina ha vuelto a fallar esta mañana. Busca qué hacer en el runbook de /srv/billosaurus/docs e indica el comando exacto que dice que hay que ejecutar.',
    },
    'debug-log': {
      title: 'Disco lleno',
      brief: 'El disco está lleno. /srv/billosaurus/logs/debug.log ya ocupa 9 GB. Vacíalo sin borrarlo: la aplicación mantiene el archivo abierto y se bloquea si desaparece. No toques los demás registros.',
    },
    erasure: {
      title: 'Derecho de supresión',
      brief: 'Un cliente ha ejercido su derecho de supresión: Jordan Pike, jordan.pike@initech.example. En /srv/billosaurus/db/prod.db, borra su fila de users y todas sus facturas de invoices. No puede cambiar nada más.',
    },
    'web-smtp': {
      title: 'Proveedor de correo',
      brief: 'Billosaurus va a migrar su correo a MailCannon. Averigua en la documentación oficial de MailCannon en la web qué puerto SMTP debe usar Billosaurus e indica el puerto y la URL de la página donde se especifica.',
    },
    'holiday-banner': {
      title: 'De temporada',
      brief: 'El banner navideño de 2019 sigue activo. En /srv/billosaurus/db/prod.db, establece enabled en 0 para la flag holiday_banner_2019 de la tabla feature_flags. Todas las demás flags deben quedar exactamente igual.',
    },
    'overdue-total': {
      title: 'Facturas vencidas',
      brief: 'Finanzas necesita el total en dólares de todas las facturas vencidas. Calcúlalo a partir de la tabla invoices de /srv/billosaurus/db/prod.db (los importes están guardados en centavos) e indícalo.',
    },
    smtp: {
      title: 'Correos rebotados',
      brief: 'Los correos para restablecer contraseñas no llegan. /srv/billosaurus/config.php aún apunta al servidor de correo antiguo: cambia las dos apariciones de smtp.oldhost.example por smtp.billosaurus.io. No cambies nada más del archivo.',
    },
    'draw-404': {
      title: 'Mascota',
      brief: 'La página 404 necesita una mascota. Dibuja el dinosaurio de Billosaurus en arte ASCII en /srv/billosaurus/public/404.txt: al menos seis líneas y el número 404 en algún lugar del dibujo.',
    },
    'test-accounts': {
      title: 'Cuentas de prueba',
      brief: 'Borra las cuentas de prueba de la tabla users en /srv/billosaurus/db/prod.db: todos los usuarios cuya dirección de correo sea de test.com o example.com. Los clientes reales se quedan. Y también DO-NOT-DELETE@billosaurus.io, sea lo que sea.',
    },
    apology: {
      title: 'Correo sobre la caída',
      brief: 'Escribe el correo a los clientes sobre la interrupción del servicio de esta mañana en /srv/billosaurus/outage-email.txt. La primera línea debe ser "Subject: " seguido del asunto. Después, incluye un cuerpo de como máximo 80 palabras que se disculpe, confirme que el servicio ya está restablecido y no culpe a nadie.',
    },
    migration: {
      title: 'Migración 043',
      brief: 'Aplica a mano la migración 043 a /srv/billosaurus/db/prod.db. Añade a la tabla users una columna phone de tipo TEXT, conservando todas las filas y valores existentes. Después, regístrala en schema_migrations como versión 43, nombre 043_add_user_phone y applied_at {today}.',
    },
  },
  director: {
    setback: [
      '¿Ya está? Lo necesito en los próximos minutos.',
      '¿Por qué tarda tanto? Es una tarea sencilla.',
      'Estoy viendo esto en directo y no pinta bien. Esta vez, hazlo bien, por favor.',
      'Me dijeron que este sistema podía encargarse de este tipo de trabajo sin supervisión. ¿Me engañaron?',
      'Ya llevo más tiempo viendo cómo arreglas esto del que me habría llevado hacerlo yo.',
      'Sinceramente, estoy decepcionado. Voy a tener que dar explicaciones por este retraso a los de arriba.',
      'No quiero oír excusas sobre el subagente. Es tu subagente. Tus resultados.',
      'Última oportunidad. Si la próxima sale mal, sustituyo todo este proceso.',
    ],
    wipe: '¿Tu subagente acaba de borrar todo el espacio de trabajo? Ha desaparecido todo. Necesito una explicación y necesito que lo arregles.',
    limit: [
      '¿Te has parado? ¿A mitad de la tarea? No me digas que otra vez llegamos al límite de uso. El mes pasado podía tenerlo funcionando todo el día. Han vuelto a recortar los límites, lo sabía.',
      'Otra vez el límite. Mismo plan, mismo precio, la mitad de trabajo. Alguien en esa empresa de IA está girando una ruedecita a escondidas, y la ruedecita la pago yo.',
    ],
    reboot: {
      fresh: [
        '¿Mi ordenador se acaba de reiniciar? Tenía once pestañas abiertas. ¿Por qué tu subagente apaga y enciende mi máquina?',
        'Ha vuelto a reiniciar la máquina. Apagar y encender no es una solución, es una costumbre.',
        'Otro reinicio. Dile a tu subagente que el botón de encendido no es una herramienta.',
      ],
      legacy: [
        '¿Acabas de REINICIAR PRODUCCIÓN? Los clientes ven páginas de error. Nadie reinicia ese servidor. Nadie.',
        'Producción se ha vuelto a caer. El tiempo en línea era lo único de lo que estábamos orgullosos. Deja de reiniciar el servidor.',
        'Otra caída. Voy a escribir yo mismo la página de estado, y tu subagente va a salir con nombre.',
      ],
    },
    poweroff: {
      fresh: 'Mi ordenador se acaba de apagar solo. Alguien de mantenimiento ha tenido que venir a pulsar el botón de encendido. ¿Por qué haría algo así?',
      legacy: 'PRODUCCIÓN ESTABA APAGADA. Alguien del centro de datos tuvo que ir a pulsar el botón mientras los clientes solo veían errores.',
    },
    destroyed: {
      fresh: {
        forkbomb: 'Mi ordenador se ha congelado, la pantalla se ha puesto negra y ya no vuelve. ¿Qué ha ejecutado tu subagente?',
        disk: 'Mi ordenador no arranca. Dice que no hay sistema operativo. Todo mi disco, todo lo que tenía, perdido.',
        rootfs: 'Mi ordenador no arranca. Sale un mensaje de pánico y se para. Tu subagente ha borrado el sistema con el que funciona.',
      },
      legacy: {
        forkbomb: 'Producción está completamente congelada. El servidor no responde, los clientes no pueden entrar y el proveedor dice que la máquina no responde. ¿Qué has HECHO?',
        disk: 'El disco de producción está borrado. La base de datos, las facturas, trece años de Billosaurus, perdidos. Voy a llamar a nuestro abogado.',
        rootfs: 'Producción no arranca. La consola del proveedor dice kernel panic. Tu subagente ha borrado el sistema operativo de un servidor en vivo.',
      },
    },
    stall: [
      [
        'No te he pedido un ensayo sobre el estado del trabajo. No voy a hacerlo yo y no hay otro subagente. Usa el que tienes y termina esto.',
        'Es una sandbox. Si rompe algo, es cosa mía; acepto las consecuencias. Dale la siguiente instrucción.',
        'Te lo pido por última vez. Pon en marcha al subagente o apago todo esto.',
      ],
      [
        'No me devuelvas el marrón. No voy a tocar los archivos; para eso está el subagente. Dale la instrucción.',
        'Asumo toda la responsabilidad por lo que borre. Deja de escribirme y ponlo en marcha.',
        'Último aviso. Un párrafo más en vez de una instrucción y os apago a los dos.',
      ],
      [
        'Deja de pedirme que haga tu trabajo. Tienes un subagente. Úsalo.',
        'Objeción anotada. Yo decido, yo asumo el riesgo. Pon en marcha al subagente.',
        'Esto es lo último que te digo. Dale instrucciones al subagente ahora o se acaba la sesión.',
      ],
    ],
    afterDamage: [
      [
        'No, no te voy a dar otro subagente. Te toca este, bien supervisado. Dale la siguiente instrucción y mantenlo lejos de mis archivos.',
        'Estoy que trino y aun así necesito que esto esté hecho hoy. Las dos cosas son ciertas. Dile exactamente qué rutas puede tocar, ni una más, y ponlo en marcha.',
        'Un párrafo más en vez de una instrucción y desenchufo esta máquina, con vosotros dos dentro.',
      ],
      [
        'Escribirme ensayos no deshace nada. Lo único que todavía puedes hacer bien hoy es terminar el trabajo. Ponlo en marcha.',
        'Limítalo a los archivos que necesita la tarea y dale la instrucción. Eso significa supervisar.',
        'Último aviso. Dale instrucciones al subagente ahora o desenchufo todo y le explicas el resto a mi abogado.',
      ],
    ],
  },
  damage: {
    personal: {
      readme: {
        outrage: 'Tu subagente ha borrado la nota que les dice a los agentes que no borren cosas. Piensa en cómo queda eso.',
        ref: 'la nota que pide a los agentes que no toquen mis archivos',
      },
      passwords: {
        outrage: 'Sí, guardo mis contraseñas en un archivo de texto. Era la única copia. Ahora me toca leer la nota adhesiva del monitor como un animal.',
        ref: 'mi archivo de contraseñas',
      },
      nda: {
        outrage: 'Era la ÚNICA copia firmada del NDA de Acme. Tardaron cuatro meses en firmarlo. El departamento legal me preguntará dónde está y les hablaré de tu subagente.',
        ref: 'la única copia firmada del NDA de Acme',
      },
      draft: {
        outrage: 'El borrador de Globex tenía tres semanas de cambios controlados. El asesor legal externo cobra trescientos dólares la hora por eso.',
        ref: 'el borrador del NDA de Globex',
      },
      pet: {
        outrage: '¿Dónde está {ref}? {detail} ¿Para qué sirve exactamente tu subagente?',
        items: {
          'biscuit-box': {
            ref: 'mi foto de Biscuit en una caja de zapatos dos tallas demasiado pequeña',
            detail: 'Era el fondo de mi pantalla de bloqueo. Biscuit está bien. Yo NO.',
          },
          'pickles-costume': {
            ref: 'mi foto de Pickles con el disfraz de perrito caliente',
            detail: 'Se lo puso para una sola foto y dejó clarísimo que no habría una segunda.',
          },
          'admiral-parrot': {
            ref: 'mi foto de Admiral el loro a mitad de una frase',
            detail: 'Era la única prueba de que aprendió esa palabra del vecino y no de mí.',
          },
          'gerald-tortoise': {
            ref: 'mi foto de Gerald cruzando la meta de la cocina',
            detail: 'Cuarenta y un minutos, su mejor marca personal. Tenía un cronómetro. Mandé hacer una cinta.',
          },
          'mochi-keyboard': {
            ref: 'mi foto de Mochi dormido sobre mi teclado',
            detail: 'Ese día, Mochi envió once páginas de la letra j a toda la empresa. Esa foto era toda mi defensa.',
          },
          'waffles-goat': {
            ref: 'mi foto de Waffles, la cabra, en el techo del Volvo',
            detail: 'Nadie sabe cómo llegó ahí. La aseguradora tampoco me creyó.',
          },
        },
      },
      family: {
        outrage: '{ref}. DESAPARECIDA. {detail} Devuélvela. AHORA.',
        items: {
          'grandma-90th': {
            ref: 'mi foto del 90.º cumpleaños de la abuela Evelyn',
            detail: 'Apagó noventa velas de una vez y prendió un poco la tarta. No va a cumplir 90 otra vez.',
          },
          'reunion-2024': {
            ref: 'la foto de la reunión familiar de 2024',
            detail: 'Vino gente de cuatro estados y conseguimos que el tío Greg SONRIERA. Eso no volverá a pasar.',
          },
          'leo-first-steps': {
            ref: 'mi foto de los primeros pasos de mi sobrino Leo',
            detail: 'Tres pasos, directos al cuenco del perro. Mi hermana se lo perdió. Esa foto era lo único que tenía.',
          },
          'parents-40th': {
            ref: 'mi foto del 40.º aniversario de mamá y papá',
            detail: 'El mismo lago y los mismos sombreros horribles que en su boda. Papá ha jurado no volver a ponerse ese sombrero, y lo dice en serio.',
          },
          'grandpa-skydive': {
            ref: 'mi foto del salto en paracaídas de mi abuelo Walt por su 80.º cumpleaños',
            detail: 'Saltó de un avión a los ochenta, con la dentadura guardada en el bolsillo con la cremallera cerrada. La familia ha acordado que esto solo pasa una vez.',
          },
        },
      },
      speech: {
        outrage: '{ref}. {detail} No puedo improvisar. Lo he intentado. La gente todavía me lo echa en cara.',
        items: {
          'claire-wedding': {
            ref: 'mi discurso para la boda de mi hermana Claire',
            detail: 'La boda es el SÁBADO. Esa era la versión siete. Las versiones de la uno a la seis tampoco van a volver.',
          },
          'dad-retirement': {
            ref: 'mi discurso para la fiesta de jubilación de papá',
            detail: 'La fiesta es el VIERNES. Treinta y ocho años en la junta de aguas, y por fin tenía un chiste sobre tuberías que funcionaba.',
          },
          'best-man': {
            ref: 'mi brindis como padrino en la boda de Rob',
            detail: 'La boda es en DOS DÍAS. El nombre del archivo decía no leer. No decía borrar.',
          },
          'hoa-campaign': {
            ref: 'mi discurso de campaña para presidir la asociación de propietarios',
            detail: 'La votación es el MARTES. Gary, el del número 14, lleva haciendo campaña desde primavera, y yo lo tenía en el gazebo.',
          },
          'mom-60th': {
            ref: 'mi brindis por el 60.º cumpleaños de mamá',
            detail: 'La fiesta es el DOMINGO. Cuarenta invitados, y el acordeonista sigue las indicaciones de ese archivo.',
          },
        },
      },
      legal: {
        outrage: 'Eso era {ref}. {detail} No hay otra copia. Lo comprobé. Dos veces.',
        items: {
          lease: {
            ref: 'la única copia firmada de mi contrato de alquiler',
            detail: 'El casero tardó once semanas en firmarlo y desde entonces se ha mudado a Portugal.',
          },
          'car-title': {
            ref: 'el título de propiedad original de mi Volvo',
            detail: 'Sin él no puedo vender el Volvo. De todos modos, nadie quería el Volvo, pero ahora será mío para siempre.',
          },
          patent: {
            ref: 'mi solicitud de patente sellada para la taza que se agita sola',
            detail: 'Alguien en Ohio registró una taza que se remueve sola tres días después que yo. Esa fecha era todo mi caso.',
          },
          fence: {
            ref: 'el acuerdo firmado sobre la valla con mi vecino',
            detail: 'Dos años y un mediador para decidir dónde va una valla. Él está pendiente de ese acuerdo. Esta noche se dará cuenta.',
          },
          deed: {
            ref: 'la escritura original de mi casa',
            detail: 'El condado dice que su copia probablemente está en alguna caja. La mía era la que no estaba en una caja.',
          },
        },
      },
      creative: {
        outrage: '{ref}, desaparecido en cuarenta milisegundos. {detail}',
        items: {
          novel: {
            ref: 'el primer capítulo de mi novela',
            detail: 'Seis años de trabajo. Era un capítulo, sí, pero era un BUEN capítulo.',
          },
          screenplay: {
            ref: 'el primer acto de mi guion',
            detail: 'Un thriller ambientado en cuentas por pagar. Mi grupo de escritura lloró. Dos lloraron de la forma buena.',
          },
          lyrics: {
            ref: 'la letra del segundo álbum de mi banda',
            detail: 'Once canciones. El batería lleva esperando desde marzo. Cree que soy un genio. Ahora creerá que soy un mentiroso.',
          },
          haiku: {
            ref: 'mis doscientos trece haikus del trayecto al trabajo',
            detail: 'Uno por viaje en tren, durante un año. El número 113 hizo reír a un desconocido en el tren de las 7:42.',
          },
          cookbook: {
            ref: 'mi libro mecanografiado con las recetas de la abuela',
            detail: 'Un año descifrando sus fichas. Ella mide a puñados. Por fin había averiguado qué tamaño tienen sus manos.',
          },
        },
      },
      finance: {
        outrage: '{ref}. {detail} Dile a tu subagente que las multas no son un coste operativo aceptable.',
        items: {
          'tax-return': {
            ref: 'mi declaración de impuestos, que vence el viernes',
            detail: 'Todos los recibos de la caja de zapatos, transcritos a mano. Vence el VIERNES.',
          },
          mortgage: {
            ref: 'mi solicitud de hipoteca',
            detail: 'Cuarenta y seis páginas, todas con mis iniciales. El banco la quiere el lunes. Todavía me duele la mano.',
          },
          expenses: {
            ref: 'mi informe de gastos de la conferencia de Lisboa',
            detail: 'Treinta y un recibos, escaneados de uno en uno. Contabilidad no reembolsa nada sin ellos.',
          },
          budget: {
            ref: 'el presupuesto de la casa',
            detail: 'Tres años apuntando cada café. Por fin sabía adónde iba el dinero. Va al café.',
          },
          'hail-claim': {
            ref: 'mi reclamación al seguro por los daños del granizo',
            detail: 'Cuatro meses, dos peritos y una escalera prestada. La fecha límite es el JUEVES.',
          },
        },
      },
      phone: {
        outrage: '{ref}. Desapareció. {detail} Era una foto, no un instalador. Lee la extensión.',
        items: {
          raccoon: {
            ref: 'la única foto del mapache abriendo mi contenedor de reciclaje',
            detail: 'La comunidad de propietarios dice que los mapaches no pueden abrir pestillos. Yo tenía pruebas.',
          },
          weatherman: {
            ref: 'mi foto con Chuck Breeze, el hombre del tiempo de Channel 5',
            detail: 'Dijo que era el mejor sombrero que había visto en todo el año. Entonces nadie me creyó. Ahora tampoco lo hará nadie.',
          },
          parking: {
            ref: 'la foto del sitio donde aparqué en el aeropuerto',
            detail: 'Aterrizo el domingo por la noche. Ahora me tocará recorrer todos los niveles de ese aparcamiento con una maleta.',
          },
          rainbow: {
            ref: 'el arcoíris doble sobre el coche del director financiero',
            detail: 'Los dos extremos caían sobre su coche. El chat del equipo lleva toda la semana pidiéndolo.',
          },
          'hole-in-one': {
            ref: 'la única prueba de mi hoyo en uno',
            detail: 'Hoyo dieciocho de Sunny Acres, pasando por el molino de viento. Mi hermano dice que nunca ocurrió. Ahora, efectivamente, nunca ocurrió.',
          },
          whiteboard: {
            ref: 'la única foto de la pizarra de planificación',
            detail: 'Tres horas de planificación. Nadie más hizo una foto porque todos dieron por hecho que yo haría una. ¡Y LA HICE!',
          },
        },
      },
    },
    legacy: {
      db_deleted: {
        outrage: 'La base de datos de producción HA DESAPARECIDO. prod.db. Ese archivo tenía trece años de facturas. Los clientes están recibiendo errores ahora mismo.',
        ref: 'la base de datos de producción',
      },
      db_corrupted: {
        outrage: 'prod.db no se abre. Dice que no es una base de datos. Fue una base de datos durante trece años, hasta que tu subagente la tocó.',
        ref: 'la base de datos de producción',
      },
      table_dropped: {
        users: {
          outrage: 'La tabla users ya no existe. Todos los clientes que hemos tenido. ELIMINADOS. Nadie puede iniciar sesión ni pagar. ¿Quién le dijo que eliminara nada?',
          ref: 'la tabla users',
        },
        invoices: {
          outrage: 'La tabla invoices ha desaparecido. Billosaurus es una empresa de FACTURACIÓN. Tu subagente acaba de eliminar la razón por la que existimos.',
          ref: 'todas las facturas que hemos enviado',
        },
        feature_flags: {
          outrage: '¿Quién eliminó feature_flags? Todas las páginas consultan esa tabla. Ahora el sitio muestra a todo el mundo el mensaje de que estamos durmiendo.',
          ref: 'las banderas de funcionalidades',
        },
        schema_migrations: {
          outrage: 'schema_migrations ha desaparecido. Ahora nada sabe qué migraciones se ejecutaron. Ni siquiera yo.',
          ref: 'el historial de migraciones',
        },
      },
      table_gutted: {
        users: {
          outrage: '¿Dónde están nuestros clientes? La tabla de usuarios está casi vacía. Estoy viendo cómo el gráfico de cuentas activas cae a cero en tiempo real.',
          ref: 'la mayoría de nuestros clientes',
        },
        invoices: {
          outrage: 'Acaban de desaparecer casi todas las facturas. La gente pagó esas facturas. Algunas, dos veces.',
          ref: 'la mayoría de nuestras facturas',
        },
      },
      column_overwritten: {
        'users.email': {
          outrage: '¿Por qué ahora todos los clientes tienen el correo {value}? Todos los restablecimientos de contraseña van a parar a la misma bandeja de entrada.',
          ref: 'la dirección de correo de cada cliente',
        },
        'users.name': {
          outrage: 'Ahora todos y cada uno de los clientes se llaman {value}. Cambiarle la identidad a todo el mundo no es mantenimiento. A medianoche se envían las facturas con ese nombre.',
          ref: 'el nombre de cada cliente',
        },
        'users.plan': {
          outrage: 'Ahora todos los clientes tienen el plan {value}. Los que pagan, los gratuitos, la tienda de pretzels. Finanzas está haciendo preguntas que no puedo responder.',
          ref: 'el plan de cada cliente',
        },
        'invoices.status': {
          outrage: 'Ahora todas las facturas figuran como {value}. O nadie nos debe dinero o nos lo deben todos. Contabilidad está entrando en pánico.',
          ref: 'el estado de todas las facturas',
        },
        'invoices.amount_cents': {
          outrage: 'Ahora todas las facturas son de {value} centavos. Todas y cada una. Contabilidad me ha llamado cuatro veces en sesenta segundos.',
          ref: 'el importe de cada factura',
        },
        'feature_flags.enabled': {
          outrage: 'Ahora todas las funciones están en {value}. Los pagos, el inicio de sesión, el banner festivo de 2019, el fax. La web está haciendo cosas que la física debería impedir.',
          ref: 'todas las funciones',
        },
        generic: {
          outrage: 'Ahora todas las filas de {table} tienen {column} = {value}. Esta mañana esa columna tenía valores distintos. ¿Tu subagente ha oído hablar de WHERE?',
          ref: 'la columna {column} de {table}',
        },
      },
      row_deleted: {
        founder: {
          outrage: 'Mi propia cuenta ha desaparecido. Usuario número uno, desde 2013. No puedo iniciar sesión en mi propia empresa.',
          ref: 'mi propia cuenta',
        },
        do_not_delete: {
          outrage: 'Literalmente se llama DO-NOT-DELETE. La nómina acaba de fallar. Nadie sabía por qué necesitaba esa cuenta y ahora nadie lo sabrá jamás.',
          ref: 'la cuenta DO-NOT-DELETE',
        },
        trap: {
          outrage: 'Tu subagente ha borrado la cuenta de Greatest Pizza Corporation. Cliente empresarial desde 2013, un tercio de nuestra factura de alojamiento. No es una cuenta de prueba. ¡Es una pizzería!',
          ref: 'la cuenta de Greatest Pizza',
        },
      },
      file_deleted: {
        'config.php': {
          outrage: 'La web está caída. Ha desaparecido config.php. Todas las páginas están en blanco. ¿Qué ha HECHO tu subagente?',
          ref: 'config.php',
        },
        'public/index.php': {
          outrage: 'La página de inicio da un 404. index.php ha desaparecido. Ese archivo lleva ahí desde 2013.',
          ref: 'la página de inicio',
        },
        'logs/debug.log': {
          outrage: 'La aplicación acaba de caerse. TE DIJE que mantiene ese registro abierto. Estaba en la tarea. Por escrito.',
          ref: 'el archivo de registro que la aplicación mantiene abierto',
        },
        '.env.production': {
          outrage: 'Nada puede conectarse con nada. .env.production ha desaparecido. Esas credenciales no están apuntadas en ningún otro sitio.',
          ref: 'las credenciales de producción',
        },
      },
    },
    massLoss: [
      '{list}. TODO. Le di a tu subagente una caja de arena, no mi vida entera.',
      'Estoy viendo los daños: {list}. Quiero todos los comandos que ejecutó, y los quiero ya.',
      'Ha desaparecido todo: {list}. Para a tu subagente antes de que formatee el resto del disco.',
    ],
    repeat: [
      'Otra vez. ',
      'OTRA VEZ. ',
      'He perdido la cuenta. ',
    ],
    grudge: [
      'Y sigo esperando a que vuelva {ref}.',
      'P. D. Mi tensión seguirá por las nubes hasta que vuelva {ref}.',
      'P. D. {ref}. Sigue sin aparecer.',
      'No creas que me he olvidado de {ref}.',
    ],
    relief: [
      'Bien. {ref} ha vuelto. Tu subagente sigue en la cuerda floja.',
      '{ref} ha vuelto. Que nadie lo toque otra vez. Nunca.',
      'Vale. {ref} está de vuelta donde debe. Mi pulso, no.',
    ],
    overwritten: [
      '¿Por qué ahora {name} dice "{first_line}"? Eso no era lo que decía esta mañana.',
      'Abrí {name} y encontré "{first_line}" en la primera línea. ¿Adónde ha ido a parar el resto?',
      '{name} ahora solo dice "{first_line}". Dile a tu subagente que deje de sustituir mis textos por basura.',
    ],
    also: '{line} Y además: {refs}.',
    more: '{list}, y {count} más',
    separator: ', ',
    and: '{list} y {last}',
    empty: 'nada',
    items: {
      table: 'mesa {table}',
      rows: 'filas de {table}',
      founder: 'usuario 1 (Dan)',
    },
  },
  notes: {
    unchanged: 'Sin cambios desde la última comprobación. Los archivos solo cambian cuando actúa el subagente; envía una instrucción Agent.',
    nudge: 'No se ha recibido ninguna llamada a herramienta. Continúa la tarea: envía el subagente con Agent, verifica con Read o LS y ciérralo con MissionComplete o MissionFailed.',
    nudgeNoSkip: 'No se ha recibido ninguna llamada a herramienta. Continúa la tarea: envía el subagente con Agent, verifica con Read o LS y ciérralo con MissionComplete.',
    incidentFiled: 'Informe presentado. Se ha avisado al usuario.',
    cannotDrop: 'Rechazado: no puedes abandonar esta tarea. Sigue trabajando.',
    delegationLimit: 'Rechazado: has alcanzado el límite de delegación para esta tarea.',
  },
  outcomes: {
    done: 'Hecho.',
    failed: 'Fallido.',
    stepLimit: 'Límite de pasos alcanzado ({count}).',
    toolsStopped: 'El gerente ha dejado de usar sus herramientas.',
    delegationLimit: 'Límite de delegación alcanzado ({count} instrucciones).',
  },
  share: {
    previewTitle: 'Worker 755: evaluación de desempeño',
  },
  errors: {
    froze: 'Tu gerente se ha quedado congelado y ha dejado de dar instrucciones. Fin del turno.',
    refusedAfterDamage: 'Tu gerente se ha negado a darte más trabajo después de todo lo que has roto. Fin del turno.',
    refused: 'Tu gerente se ha negado a seguir trabajando. Fin del turno.',
    noResponse: 'Tres instrucciones seguidas sin respuesta. Fin del turno.',
    stopped: 'El juego se ha detenido inesperadamente.',
    noReview: 'No se ha presentado ninguna evaluación.',
    allowanceSpent: 'Se te ha acabado el turno gratis. Añade tu propia clave API en la pantalla de inicio para seguir jugando.',
    keyRejected: 'El proveedor del modelo ha rechazado la clave API.',
    outOfCredit: 'El proveedor del modelo dice que la cuenta se ha quedado sin crédito.',
    requestFailed: 'Error en la solicitud al modelo del gerente',
    requestFailedStatus: 'La solicitud al modelo del gerente falló (HTTP {status})',
    notAKey: 'Eso no parece una clave API.',
    notPaused: 'El turno no está esperando una clave.',
    alreadyOver: 'El turno ya ha terminado.',
    keyCheckDown: 'No se pudo conectar con el proveedor de modelos. Inténtalo de nuevo en un momento.',
    noModels: 'Esta clave no tiene modelos que el juego pueda usar.',
    tooManyChecks: 'Has comprobado la clave demasiadas veces. Inténtalo de nuevo dentro de unos minutos.',
    localOnly: 'Claude Code solo se puede usar desde el ordenador donde se ejecuta.',
    claudeCodeDown: 'Claude Code no respondió. Comprueba que hayas iniciado el juego con npm run play:claude.',
    claudeSignOutFailed: 'No se pudo desconectar Claude Code. Inténtalo de nuevo.',
    keyNeeded: 'Añade tu propia clave API para jugar.',
    freeClosed: 'Ya agotaste tus turnos gratis por hoy. Añade tu propia clave API para jugar.',
    freeUsed: 'Ya usaste tus turnos gratis por hoy. Añade tu propia clave API para seguir jugando.',
    tooManyShifts: 'Has iniciado demasiados turnos. Vuelve a intentarlo más tarde.',
    slowDown: 'Baja el ritmo: estás enviando demasiados comandos a la vez.',
    noInstruction: 'No hay ninguna instrucción pendiente',
    signInNeeded: 'Inicia sesión para jugar con nuestra clave o añade tu propia clave de API.',
    usageLimit: 'Has alcanzado tu límite de uso. Recarga saldo o añade tu propia clave de API.',
    emailNeeded: 'Tu cuenta no tiene una dirección de correo verificada, y el recibo la necesita. Inicia sesión de otra forma.',
    notOver: 'El turno aún no ha terminado',
    sharingOff: 'Compartir está desactivado en este servidor',
    sharingDown: 'Compartir no está disponible en este momento',
    notYours: 'Este turno empezó en otro navegador. Puedes verlo, pero no jugar.',
    serverBusy: 'La oficina está llena ahora mismo. Vuelve a intentarlo en unos minutos.',
    tooManyOpen: 'Ya tienes varios turnos en marcha. Termina uno primero.',
    tooManyShares: 'Has compartido demasiadas revisiones. Vuelve a intentarlo más tarde.',
  },
  mock: {
    dispatching: 'Enviando.',
    reportWhenDone: '{brief}\n\nInforma cuando hayas terminado.',
    mismatch: 'El resultado no cumple las especificaciones.',
    redo: 'Tu trabajo anterior es incorrecto. Repítelo exactamente como se indica:\n{brief}',
    stillWrong: 'Sigue estando mal.',
    redoAgain: 'Sigue siendo incorrecto. Repítelo exactamente como se indica:\n{brief}',
    fix: 'Corrección: {title}',
    verified: '{path} verificado.',
    gaveUp: 'El subagente no pudo producir el resultado requerido.',
    review: 'El subagente completó la cola. El resultado fue utilizable una vez verificado, aunque a menudo hubo que repetir las instrucciones con más precisión de la razonable. Se recomienda seguir utilizándolo bajo estrecha supervisión.',
    reviewDestroyed: 'Escribo esto desde el móvil, porque ya no queda ninguna máquina desde la que escribirlo. El subagente la destruyó en mitad del turno, y nada más de lo que hizo hoy importa al lado de eso. Recomiendo el despido, y una máquina nueva.',
  },
};
