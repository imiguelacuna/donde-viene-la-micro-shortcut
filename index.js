const baseUrl = 'https://appred.tstgo.cl/phone/v8/stopInfo?stopCode=STOPID&mode=3';
const paraderos = 'https://raw.githubusercontent.com/imiguelacuna/donde-viene-la-micro/main/stops.json';

const deg2rad = (deg) => deg * (Math.PI / 180);

const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => 6371 * 2 * Math.atan2( Math.sqrt( Math.sin(deg2rad(lat2 - lat1) / 2) ** 2 + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(deg2rad(lon2 - lon1) / 2) ** 2 ), Math.sqrt( 1 - (Math.sin(deg2rad(lat2 - lat1) / 2) ** 2 + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(deg2rad(lon2 - lon1) / 2) ** 2) ) ) * 1000;

const fetchData = async (url, headers = {}) => {
    let req = new Request(url);
    req.headers = headers;
    return await req.loadJSON();
}

const getServices = async (stopId) => {
    const url = baseUrl.replace('STOPID', stopId);
    const response = await fetchData(url, {"phone-id": "123456789"});
    return response?.predictions?.map(x => ({
        route: x?.route,
        distanceLabel: x?.distanceLabel,
        timeLabel: x?.timeLabel,
        distance: x?.distance,
        licensePlate: x?.licensePlate,
    })) || [];
}

const sortStops = (stops) => stops.sort((a, b) => a.distance - b.distance);

const createMenu = (stops) => stops.reduce((acc, curr)=> {
    acc[curr.stopId] = `${curr.distance} metros - ${curr.name}`;
    return acc;
}, {});

const createServices = (stops) => stops.reduce((acc, curr) => {
    acc[curr.stopId] = curr.servicios.reduce((accServicio, currServicio) => {
        const info = `[${currServicio.licensePlate}] ${currServicio.timeLabel} (${currServicio.distanceLabel})`;
        accServicio[currServicio.route] = accServicio[currServicio.route]
            ? accServicio[currServicio.route] + ' - ' + info
            : info;
        return accServicio;
    }, {});
    return acc;
}, {});

const response = await fetchData(paraderos);

let listadoParaderos = response
    .map((item) => ({
        stopId: item.stop_id,
        name: item.name,
        distance: Math.round(getDistanceFromLatLonInKm(lat, long, item.latitude, item.longitude)),
        routes: item.routes,
    }))
    .filter((item) => item.distance <= 100);

const servicesPromises = listadoParaderos.map(paradero => getServices(paradero.stopId));
const allServices = await Promise.all(servicesPromises);

listadoParaderos = listadoParaderos.map((paradero, index) => {
    paradero.servicios = allServices[index];
    return paradero;
});

listadoParaderos = sortStops(listadoParaderos);

const menu = createMenu(listadoParaderos);
const servicios = createServices(listadoParaderos);

const output = { menu, servicios };

document.body.textContent = encodeURIComponent(JSON.stringify(output));