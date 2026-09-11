/* Encuadres revisados por foto. Coordenadas del recorte cuadrado en unidades
 * del ancho original; no se modifican los archivos. Referencia: Juan Martín Arango.
 * La URL evita reutilizar un encuadre cuando se reemplaza la foto del candidato. */
(function(){
  "use strict";
  var profiles = {
    // Vicente Ospina Palacio
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/1.png": {"x": 0.090536, "y": 0.230645, "size": 0.744916},
    // Benjamín Soto Giraldo
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/2.png": {"x": 0.00799, "y": 0.162653, "size": 0.811413},
    // Maria Paz Cadavid Maldonado
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/3.png": {"x": 0.223978, "y": 0.254357, "size": 0.66244},
    // Mariana Restrepo Ramírez
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/4.png": {"x": 0.160277, "y": 0.150557, "size": 0.703681},
    // Juan Martín Ocampo Restrepo
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/5.png": {"x": 0.199821, "y": 0.177714, "size": 0.668084},
    // Samantha Roldán Ospina
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/6.png": {"x": 0.189441, "y": 0.149713, "size": 0.64836},
    // Lorenzo Sierra Giraldo
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/7.png": {"x": 0.115568, "y": 0.096028, "size": 0.730237},
    // María Velasco Restrepo
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/8.png": {"x": -0.032104, "y": -0.040292, "size": 1.018143},
    // Rosario Jaramillo Gómez
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/9.png": {"x": 0.016586, "y": -0.030057, "size": 0.946696},
    // Martina Uribe Castro
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/10.png": {"x": -0.026226, "y": -0.04105, "size": 1.092887},
    // Eloísa Llano Barco
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/11.png": {"x": 0.10056, "y": -0.015496, "size": 0.894401},
    // Jose María Mejía
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/12.png": {"x": 0.113337, "y": 0.279119, "size": 0.704753},
    // María Guillén
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/13.png": {"x": -0.086793, "y": 0.007868, "size": 1.059716},
    // Salvador Arbeláez
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/14.png": {"x": -0.076359, "y": 0.182945, "size": 1.169341},
    // Simón Restrepo
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/15.png": {"x": -0.038841, "y": 0.196826, "size": 1.014839},
    // Amalia Arango
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/16.png": {"x": 0.073914, "y": 0.080704, "size": 0.909697},
    // Pascual Arango
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/17.png": {"x": -0.062802, "y": -0.006576, "size": 1.089087},
    // Gabriela Soto
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/18.png": {"x": -0.001341, "y": 0.010041, "size": 1.065565},
    // Salvador Moreno
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/19.png": {"x": -0.043294, "y": 0.05869, "size": 1.006019},
    // Emilia Ojalvo
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/20.png": {"x": -0.031596, "y": 0.083206, "size": 1.105553},
    // Maximiliano Ángel
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/21.png": {"x": 0.043313, "y": 0.059094, "size": 0.965608},
    // Salvador Ramírez
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/22.png": {"x": 0.025277, "y": 0.005493, "size": 1.025183},
    // Mar Toledo
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/23.png": {"x": 0.116384, "y": 0.308863, "size": 0.577989},
    // Benjamín Sage
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/24.png": {"x": 0.073805, "y": 0.214764, "size": 0.783016},
    // Juan Martín Arango
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/25.png": {"x": 0.017373, "y": -0.002794, "size": 0.95789},
    // José Maria Duque
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/26.png": {"x": 0.072361, "y": 0.109669, "size": 0.803644},
    // Belén Vásquez
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/27.png": {"x": 0.039288, "y": 0.250803, "size": 0.687823},
    // Dominica Bustamante
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/28.png": {"x": 0.159802, "y": 0.305819, "size": 0.611439},
    // Miguel Angel Patarroyo Correa
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/29.png": {"x": 0.294637, "y": 0.324306, "size": 0.43764},
    // Sarah Shoham Cano
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/30.png": {"x": 0.202749, "y": 0.401345, "size": 0.57571},
    // Emma Penagos Vélez
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/31.png": {"x": 0.303992, "y": 0.22147, "size": 0.47104},
    // Rosario Eusse Giraldo
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/32.png": {"x": 0.322195, "y": 0.354723, "size": 0.533992},
    // Gregorio Quintero García
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/33.png": {"x": 0.199931, "y": 0.352109, "size": 0.540773},
    // Simón Urrea Barrero
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/34.png": {"x": 0.288805, "y": 0.307001, "size": 0.504334},
    // Julieta Llano Ochoa
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/35.png": {"x": 0.315678, "y": 0.31947, "size": 0.426591},
    // Alice Shin
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/36.png": {"x": 0.269541, "y": 0.338378, "size": 0.486641},
    // Benjamín Le Nouaille Cardona
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/37.png": {"x": 0.27542, "y": 0.304469, "size": 0.479392},
    // Olivia García Hurtado
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/38.png": {"x": 0.141628, "y": 0.310509, "size": 0.592747},
    // Ismael Molina Márquez
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/39.png": {"x": 0.288336, "y": 0.350551, "size": 0.447025},
    // Salvador Botero Ramírez
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/40.png": {"x": 0.322807, "y": 0.305224, "size": 0.387622},
    // Salomón Ríos Peláez
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/41.png": {"x": 0.111039, "y": 0.215827, "size": 0.849218},
    // David Felipe Casallas Lemus
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/42.png": {"x": 0.157078, "y": 0.265816, "size": 0.8161},
    // Joaquín Diez Prada
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/43.png": {"x": 0.209754, "y": 0.248743, "size": 0.68228},
    // Cristóbal Vásquez Zawadsky
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/44.png": {"x": 0.25202, "y": 0.300803, "size": 0.560864},
    // Jerónimo Velásquez Escobar
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/45.png": {"x": 0.22422, "y": 0.340761, "size": 0.536326},
    // Agustín Arango Posada
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/46.png": {"x": 0.21158, "y": 0.140115, "size": 0.613191},
    // Pascual Ochoa Betancur
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/47.png": {"x": 0.187736, "y": 0.223069, "size": 0.585637},
    // Marcos Roldán Salas
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/48.png": {"x": 0.167347, "y": 0.27025, "size": 0.717575},
    // Markus Correa Acosta
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/49.png": {"x": 0.170356, "y": 0.243485, "size": 0.747804},
    // Antonio Begué Valderrama
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/50.png": {"x": 0.134865, "y": 0.132807, "size": 0.795199},
    // Juan Pedro Arango Ujueta
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/51.png": {"x": 0.255652, "y": 0.166862, "size": 0.551226},
    // Pablo Aristizábal Vásquez
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/52.png": {"x": 0.178194, "y": 0.283484, "size": 0.680079},
    // Marco Restrepo Zambrano
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/53.png": {"x": 0.186639, "y": 0.391219, "size": 0.544115},
    // Paloma Gutiérrez Giraldo
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/54.png": {"x": 0.26906, "y": 0.403341, "size": 0.597041},
    // Amelia Posada Aguirre
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/55.png": {"x": 0.200938, "y": 0.312791, "size": 0.593359},
    // Juan Sebastián Quintero Londoño
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/56.png": {"x": 0.225366, "y": 0.316546, "size": 0.561241},
    // Matías González García
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/57.png": {"x": 0.251686, "y": 0.336237, "size": 0.636872},
    // María del Mar Cuervo Guarín
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/58.png": {"x": 0.191408, "y": 0.317767, "size": 0.482766},
    // Máximo Muñoz Dávalos
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/59.png": {"x": 0.216451, "y": 0.226712, "size": 0.70996},
    // Isaac Calderón Arango
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/60.png": {"x": 0.277241, "y": 0.244441, "size": 0.470762},
    // María Gabriela Ramírez López
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/61.png": {"x": 0.264665, "y": 0.269282, "size": 0.451144},
    // Miguel Beltrán Galindo
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/62.png": {"x": 0.294374, "y": 0.265168, "size": 0.573883},
    // Manolo Valencia Osorio
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/63.png": {"x": 0.279664, "y": 0.288153, "size": 0.494739},
    // Valentina Builes Villegas
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/64.png": {"x": 0.287492, "y": 0.420016, "size": 0.388529},
    // Jerónimo Sáenz Franco
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/65.png": {"x": 0.253446, "y": 0.253842, "size": 0.447019},
    // Antonia Gutiérrez Echeverri
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/66.png": {"x": 0.153655, "y": 0.282713, "size": 0.661934},
    // Simón Vélez Uribe
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/67.png": {"x": 0.225939, "y": 0.329408, "size": 0.665939},
    // Cristóbal Pineda Ramírez
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/68.png": {"x": 0.238602, "y": 0.298512, "size": 0.551423},
    // Nicolás Ángel Pérez
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/69.png": {"x": 0.298549, "y": 0.383578, "size": 0.411228},
    // Pedro Juan Molina Echeverri
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/70.png": {"x": 0.194035, "y": 0.243263, "size": 0.543223},
    // Tomás de la Espriella Zuluaga
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/71.png": {"x": 0.262324, "y": 0.13556, "size": 0.580057},
    // Sofía Antonia Schwartz Gaviria
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/72.png": {"x": 0.247633, "y": 0.258809, "size": 0.498678},
    // Hanna Olmos Giraldo
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/73.png": {"x": 0.170427, "y": 0.382041, "size": 0.561122},
    // Florentina Uribe Llano
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/74.png": {"x": 0.269264, "y": 0.272933, "size": 0.578338},
    // Nicolás Caviedes Orozco
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/75.png": {"x": 0.282909, "y": 0.319695, "size": 0.54257},
    // María de los Santos Herrera Duque
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/76.png": {"x": 0.257598, "y": 0.277407, "size": 0.609834},
    // Clemente Ramírez Peláez
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/77.png": {"x": 0.136435, "y": 0.185652, "size": 0.642927},
    // Leticia Pulgarín Ramírez
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/78.png": {"x": 0.170704, "y": 0.272177, "size": 0.572093},
    // Sofía Jaramillo Arcila
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/79.png": {"x": 0.222965, "y": 0.302294, "size": 0.570011},
    // Elisa Garcés Velásquez
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/80.png": {"x": 0.128127, "y": 0.15466, "size": 0.668832},
    // Candelaria Barrientos Castro
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/81.png": {"x": 0.099043, "y": 0.265405, "size": 0.722593},
    // Luciano Palacio Mejía
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/82.png": {"x": 0.310252, "y": 0.335674, "size": 0.441815},
    // Antonia Mejía Quintero
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/83.png": {"x": 0.298234, "y": 0.39103, "size": 0.407668},
    // Jerónimo Gutiérrez Echeverri
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/84.png": {"x": 0.267417, "y": 0.220979, "size": 0.580765},
    // Juan Antonio García Garcés
    "https://qnikgvtjjzxsjcbquazd.supabase.co/storage/v1/object/public/ecofriends-fotos/85.png": {"x": 0.026601, "y": -0.028489, "size": 0.907933},
  };

  window.ecofriendsPhotoStyle = function(url){
    var crop = profiles[url];
    if(!crop) return "";
    return "position:absolute;width:" + (100 / crop.size).toFixed(4) +
      "%;height:auto;max-width:none;left:" + (-100 * crop.x / crop.size).toFixed(4) +
      "%;top:" + (-100 * crop.y / crop.size).toFixed(4) + "%;";
  };
})();
