/* global google Modernizr ActiveXObject */

/**
 * Hay constructores de elementos mejores pero este es el mío.
 * @param {*} config
 */
function newElement(config) {
  const element = document.createElement(config.tag)

  if (config.text !== undefined && config.tag !== 'input') {
    element.appendChild(document.createTextNode(config.text))
  }
  if (config.text !== undefined && config.tag === 'input') {
    element.value = config.text
  }
  if (config.id !== undefined) {
    element.id = config.id
  }
  if (config.class !== undefined) {
    element.classList.add(config.class)
  }
  if (config.listener !== undefined) {
    element.addEventListener(config.listener[0], config.listener[1])
  }
  if (config.attributes !== undefined) {
    Object.keys(config.attributes).map(attribute =>
      element.setAttribute(attribute, config.attributes[attribute]))
  }
  return element
}

/**
 * AppendChild para vagos
 * @param {*} config <- Esto es un array
 */
HTMLElement.prototype.appendChildren = function (config) {
  config.map(element =>
    this.appendChild(element))
}

/**
 * Borra todos los hijos de un elemento. Game of Thrones style.
 */
HTMLElement.prototype.removeAllChildren = function () {
  this.childNodes.forEach((element) => {
    while (element.firstChild) {
      element.removeChild(element.firstChild)
    }
    element.parentNode.removeChild(element)
  })
  while (this.firstChild) {
    this.removeChild(this.firstChild)
  }
}

/**
 * Aquí hay magia negra. Primero comprobamos que Microsoft no nos rompa el
 * invento (NOTA: cosa que hizo más adelante con otra cosa), pillamos archivo
 * pasando url con path hacia nuestro json y esperamos a que el navegador
 * cargue el archivo (200 = FTP?! Lo más probable!)
 * @param {*} url
 * @param {*} callback
 */
function loadJSONFile(url, callback) {
  let xhttp
  if (window.XMLHttpRequest) {
    xhttp = new XMLHttpRequest()
  } else {
    xhttp = new ActiveXObject('Microsoft.XMLHTTP')
  }
  xhttp.onreadystatechange = function () {
    if (this.readyState === 4 && this.status === 200) {
      if (typeof callback === 'function') {
        callback(xhttp.responseText)
      }
    }
  }
  xhttp.open('GET', url, false)
  xhttp.send()
}

/**
 * Función que carga el mapa al principio. La reutilicé bastante en fases
 * previas de desarrollo. Luego decidí que dormir es para débiles y era una
 * idea chulísima usar el mismo mapa para todo.
 * @param {*} longitude
 * @param {*} latitude
 * @param {*} zoom
 */
function renderMap(longitude, latitude, zoom) {
  window.markers = []

  const mapOptions = {
    center: new google.maps.LatLng(longitude, latitude),
    zoom,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  }
  const map = new google.maps.Map(document.getElementById('map'), mapOptions)
  return map
}

/**
 * High-tech stuff. Mando nombre de archivo .json, saco lat y lng.
 * No sé si es kosher usar comillas francesas y rollo jquery.
 * Es tarde, I don't care.
 * @param {*} json
 * @param {*} item
 */
function findCoords(json, item) {
  let db
  const coords = {}
  const path = `/json/${json}.json`
  loadJSONFile(path, (responseText) => {
    db = JSON.parse(responseText)
  })

  if (db[item] !== undefined) {
    coords.lat = parseFloat(db[item].latitude, 10)
    coords.lng = parseFloat(db[item].longitude, 10)
  }
  return coords
}

/**
 * Que hay 50 ciclos en Praga capital? No problem, cambiamos los 3 últimos
 * dígitos de la lat y lng y voilà! Arrejuntar todos los ciclos en un
 * solo marcador es de menosmolas. Hola Ángel.
 * @param {*} coords
 */
function fuzzyCoords(coords) {
  const fCoords = {}
  const lat = String(coords.lat)
  const lng = String(coords.lng)

  const rnd1 = Math.floor(Math.random() * 999)
  const rnd2 = Math.floor(Math.random() * 999)

  fCoords.lat = parseFloat(lat.slice(0, -3) + rnd1, 10)
  fCoords.lng = parseFloat(lng.slice(0, -3) + rnd2, 10)

  return fCoords
}

/**
 * Borra marcadores. Esta función es a veces un poco temperamental.
 * No sé por qué falla en ocasiones. Otras veces funciona como un reloj.
 * @param {*} marker
 */
function removeMarker(marker) {
  marker.setMap(null)
  const index = window.markers.indexOf(marker)
  if (index !== -1) {
    window.markers.splice(index, 1)
  }
}

/**
 * Esta función es el MVP del código. Mira si un marcador existe o no.
 * Suena estúpido, pero hasta que se me ocurrió la tontada esta...
 * @param {*} mobility
 */
function alreadyExists(mobility) {
  return function (element) {
    return element.class === mobility.ciclo
  }
}

/**
 * Crea marcador según clase (país o ciclo), o lo deja estar si ya existe
 * @param {*} mobility
 * @param {*} markerClass clase del marcador
 */
function renderMarkers(mobility, markerClass) {
  if (!window.markers.find(alreadyExists(mobility))) {
    const myLatLng = fuzzyCoords(findCoords('cities', mobility.ciudad))
    const infocontent = `<p><b>Ciclo:</b><br />${mobility.ciclo}<br /><em>${mobility.tipo}</em></p>` +
                        `<p><b>Ciudad:</b><br />${mobility.ciudad}, ${mobility.pais}</p>`
    const infowindow = new google.maps.InfoWindow({
      content: infocontent
    })
    const marker = new google.maps.Marker({
      position: myLatLng,
      class: markerClass,
      icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
      map: window.map,
      animation: google.maps.Animation.DROP,
      title: mobility.ciclo
    })
    marker.addListener('click', () => {
      infowindow.open(window.map, marker)
      window.map.setCenter(marker.getPosition())
      window.map.setZoom(7)
      marker.setAnimation(google.maps.Animation.BOUNCE)
      setTimeout(() => {
        marker.setAnimation(null)
      }, 2150)
    })
    window.markers.push(marker)
  }
}

/**
 * Pillamos país, cargamos JSONs de movilidades y países y vamos mostrando
 * marcadores en plan pro. Aquí encima jugamos un poco con modernizr para
 * dejar los zooms niquelados en móvil. Muy chulo todo. Si os fijais
 * sacamos el zoom del json de países. Eso fue un añadido así como de última
 * hora, pero estupenda idea, oye.
 * @param {*} e
 */
function showCountry(e) {
  const country = e.currentTarget.options[e.currentTarget.selectedIndex].value
  const mobilitySelect = document.getElementById('mobilitySelect')
  const mobType = mobilitySelect.options[mobilitySelect.selectedIndex].value

  let countries
  loadJSONFile('/json/countries.json', (responseText) => {
    countries = JSON.parse(responseText)
  })

  window.map.setCenter(findCoords('countries', country))

  Object.keys(countries).map((c) => {
    if (c === country) {
      // Solo necesitaba corregir estos tres países. Feo, sí, pero más fea
      // era la alternativa: distintas fases de corrección sumando y
      // restando zoom según TAMAÑO DEL PAÍS. No estoy de broma. Esto es mejor.
      if ((c === 'Polonia' || c === 'República Checa' || c === 'Hungría') && Modernizr.mq('(max-width: 360px)')) {
        window.map.setZoom(countries[c].zoom - 1)
      } else {
        window.map.setZoom(countries[c].zoom)
      }
    }
    if (country === '') {
      window.map.setCenter(new google.maps.LatLng(49.785391, 8.953284))
      window.map.setZoom(3)
    }
  })
  let mobilities
  loadJSONFile('/json/EstructMovilidadesErasmusJSON.json', (responseText) => {
    mobilities = JSON.parse(responseText)
  })

  Object.values(mobilities).map((mobility) => {
    if (mobility.tipo === mobType || mobType === 'Todos') {
      if (mobility.pais === country) {
        renderMarkers(mobility, mobility.pais)
      } else {
        window.markers.map((marker) => {
          if (marker.class === mobility.pais) {
            removeMarker(marker)
          }
        })
      }
    }
  })
}

/**
 * Esto me da un poco de vergüencita, la verdad. Si el elemento existe me lo
 * pasa, si no, me lo crea y me lo pasa. Pereza absoluta. Si esta función
 * fuese persona sería El Nota del Gran Lebowski:
 * THE DUDE ABIDES
 */
function getCountrySelect() {
  let countrySelect
  if (!document.getElementById('countrySelect')) {
    countrySelect = newElement({
      tag: 'select',
      id: 'countrySelect',
      listener: ['change', showCountry]
    })
  } else {
    countrySelect = document.getElementById('countrySelect')
  }

  return countrySelect
}

/**
 * Mostramos opciones de país disponibles según movilidad añadiendo una opción
 * en blanco que sirva de índice. Es un poco cutre pero son como las 3 de la
 * madrugada. Que aún pueda concatenar pensamientos de modo más o menos
 * coherente es todo un milagro, oiga.
 * @param {*} mobType
 */
function loadCountryOptions(mobType) {
  const countrySelect = getCountrySelect()

  let countries
  loadJSONFile('/json/countries.json', (responseText) => {
    countries = JSON.parse(responseText)
  })

  let mobilities
  loadJSONFile('/json/EstructMovilidadesErasmusJSON.json', (responseText) => {
    mobilities = JSON.parse(responseText)
  })
  const tmpCountries = []
  Object.values(mobilities).map((mobility) => {
    if (mobility.tipo === mobType || mobType === 'Todos') {
      tmpCountries.push(mobility.pais)
    }
  })

  // Opción default
  let countryOption = newElement({
    tag: 'option',
    text: '-- Selecciona país --',
    attributes: {
      value: ''
    }
  })
  countrySelect.appendChild(countryOption)

  Object.keys(countries).map((country) => {
    if (tmpCountries.indexOf(country) !== -1) {
      countryOption = newElement({
        tag: 'option',
        text: country,
        attributes: {
          value: country
        }
      })
      countrySelect.appendChild(countryOption)
    }
  })
  return countrySelect
}

/**
 * Comprobamos de nuevo que mobType sea un string, cogemos/creamos el select
 * del país, borramos hijos y cargamos.
 * @param {*} mobType
 */
function renderCountrySearch(mobType) {
  document.getElementById('searchByCourse').style.display = 'none'
  let mobility = mobType
  if (typeof mobility !== 'string') {
    mobility = 'Todos'
  }
  const countriesDiv = document.getElementById('searchByCountry')
  countriesDiv.style.display = 'block'
  let countrySelect = getCountrySelect()
  countrySelect.removeAllChildren()
  countrySelect = loadCountryOptions(mobility)
  countriesDiv.appendChild(countrySelect)
}

/**
 * Si hay un cambio en los checkboxes añadimos o borramos marcadores del mapa.
 */
function showCourses() {
  const mobilitySelect = document.getElementById('mobilitySelect')
  const mobType = mobilitySelect.options[mobilitySelect.selectedIndex].value
  const courseBoxes = document.getElementsByName('courses')
  const checkedCourses = []
  window.map.setZoom(3)

  // Si el curso está marcado, lo metemos en un array
  Object.values(courseBoxes).map((course) => {
    if (course.checked) {
      checkedCourses.push(course.value)
    }
  })

  let mobilities
  loadJSONFile('/json/EstructMovilidadesErasmusJSON.json', (responseText) => {
    mobilities = JSON.parse(responseText)
  })

  Object.values(mobilities).map((mobility) => {
    if (mobility.tipo === mobType || mobType === 'Todos') {
      // Si encontramos el ciclo de la movilidad en los ciclos checkeados
      // mostramos los marcadores.
      if (checkedCourses.indexOf(mobility.ciclo) !== -1) {
        renderMarkers(mobility, mobility.ciclo)
      } else {
        // Si no, borramos
        window.markers.map((marker) => {
          if (marker.class === mobility.ciclo) {
            removeMarker(marker)
          }
        })
      }
    }
  })
}

/**
 * Cargamos movilidades desde JSON y vamos mirando que ciclos pertenecen al
 * ciclo en el select de movilidad. Cargamos cursos desde su JSON también,
 * contrastamos y construímos los label y los checkboxes.
 * @param {*} mobType
 */
function loadCourseOptions(mobType) {
  const coursesDiv = document.getElementById('searchByCourse')
  let courses
  loadJSONFile('/json/courses.json', (responseText) => {
    courses = JSON.parse(responseText)
  })

  let mobilities
  loadJSONFile('/json/EstructMovilidadesErasmusJSON.json', (responseText) => {
    mobilities = JSON.parse(responseText)
  })

  const tmpCourses = []
  Object.values(mobilities).map((mobility) => {
    if (mobility.tipo === mobType || mobType === 'Todos') {
      tmpCourses.push(mobility.ciclo)
    }
  })

  Object.keys(courses).map((course) => {
    if (tmpCourses.indexOf(course) !== -1) {
      const label = newElement({
        tag: 'label',
        class: 'course',
        attributes: {
          for: course
        }
      })

      const span = newElement({
        tag: 'span',
        class: 'course',
        text: course
      })

      const courseCheck = newElement({
        tag: 'input',
        text: course,
        listener: ['change', showCourses],
        attributes: {
          type: 'checkbox',
          name: 'courses'
        }
      })

      label.appendChildren([
        courseCheck, span
      ])

      coursesDiv.appendChild(label)
    }
  })
  return coursesDiv
}

/**
 * Aquí hacemos una comprobación de mobType, si el usuario se lanza a clickear
 * a lo loco a veces mobType pasa el select entero y no el value. Controlamos
 * que mobType es string. Mandamos mobility para ayudarnos a cargar opciones
 * de búsqueda.
 * @param {*} mobType <- Una rosa por otro nombre sigue siendo Movilidad
 */
function renderCourseSearch(mobType) {
  document.getElementById('searchByCountry').style.display = 'none'
  let mobility = mobType
  if (typeof mobility !== 'string') {
    mobility = 'Todos'
  }
  let coursesDiv = document.getElementById('searchByCourse')
  coursesDiv.style.display = 'block'
  // Esto hay que arreglarlo y darle tratamiento 5 estrellas
  coursesDiv.removeAllChildren()
  coursesDiv = loadCourseOptions(mobility)
}

/**
 * Esta función puede ser llamada sin mobility, de ahí que por defecto
 * tengamos la opción todos.
 * @param {*} mobility opción puesta en el select
 */
function showSearchOptions(mobility) {
  const mobType = mobility || 'Todos'
  const toggle = document.getElementById('toggle')

  // Borramos marcadores again
  window.markers.map((marker) => {
    removeMarker(marker)
  })
  if (toggle.checked) {
    renderCountrySearch(mobType)
  } else {
    renderCourseSearch(mobType)
  }
}

/**
 * Borramos marcadores en mapa y mandamos la opción seleccionada en el select
 * hacia abajo.
 * @param {*} e
 */
function selectMobility(e) {
  window.markers.map((marker) => {
    removeMarker(marker)
  })
  const mobility = e.currentTarget.options[e.currentTarget.selectedIndex].value
  showSearchOptions(mobility)
}

/**
 * Función que añade los eventListeners al select de Movilidad y al toggle
 */
function activateListeners() {
  const mobilitySelect = document.getElementById('mobilitySelect')
  mobilitySelect.addEventListener('change', selectMobility, true)

  const toggle = document.getElementById('toggle')
  toggle.addEventListener('change', showSearchOptions, true)
}

/**
 * Window.onload
 * "¡Perded toda esperanza los que aquí entráis!"
 */
window.onload = function () {
  window.map = renderMap(49.785391, 8.953284, 3)
  activateListeners()
  showSearchOptions()
}
