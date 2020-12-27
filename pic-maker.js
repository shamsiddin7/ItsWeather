const fs = require(`fs`);
const { DOMParser, XMLSerializer } = require(`xmldom`);
const sizeOf = require(`image-size`);
const sharp = require(`sharp`);
const path = require('path');
const { serializeToString: serialize } = new XMLSerializer();
const parser = new DOMParser();
const puppeteer = require('puppeteer')

let browser = null;
const newBrowser = async () => {
  browser = await puppeteer.launch();
}

const COLORS = {
  '01d':{'back':'#C4CFD5', 'top':'#0E1213', 'bottom':'#0E1213'},
  '01n':{'back':'#181622', 'top':'#FFFFFF', 'bottom':'#FFFFFF'},
  '02d':{'back':'#CDC3DB', 'top':'#575F7A', 'bottom':'#575F7A'},
  '02n':{'back':'#CDC3DB', 'top':'#575F7A', 'bottom':'#575F7A'},
  '03d':{'back':'#CDC3DB', 'top':'#575F7A', 'bottom':'#575F7A'},
  '03n':{'back':'#CDC3DB', 'top':'#575F7A', 'bottom':'#575F7A'},
  '04d':{'back':'#A3B1BC', 'top':'#0E1213', 'bottom':'#0E1213'},
  '04n':{'back':'#A3B1BC', 'top':'#0E1213', 'bottom':'#0E1213'},
  '09d':{'back':'#566766', 'top':'#FFFFFF', 'bottom':'#FFFFFF'},
  '09n':{'back':'#566766', 'top':'#FFFFFF', 'bottom':'#FFFFFF'},
  '10d':{'back':'#566766', 'top':'#FFFFFF', 'bottom':'#FFFFFF'},
  '10n':{'back':'#566766', 'top':'#FFFFFF', 'bottom':'#FFFFFF'},
  '11d':{'back':'#1A2E3D', 'top':'#FFFFFF', 'bottom':'#FFFFFF'},
  '11n':{'back':'#1A2E3D', 'top':'#FFFFFF', 'bottom':'#FFFFFF'},
  '13d':{'back':'#2F2F26', 'top':'#FFFFFF', 'bottom':'#FFFFFF'},
  '13n':{'back':'#2F2F26', 'top':'#FFFFFF', 'bottom':'#FFFFFF'},
  '50d':{'back':'#263133', 'top':'#263133', 'bottom':'#FFFFFF'},
  '50n':{'back':'#263133', 'top':'#263133', 'bottom':'#FFFFFF'}
}

const weekDays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const hoursClass = [0,5,10,15,20,25,30,35,40]

const get = (node, className, tag) => 
  Array.from(node.getElementsByTagName(tag)).filter(
    (element) =>
      element.getAttribute && element.getAttribute(`class`) === className
  );

const getElements = (node, className) => [
  ...get(node, className, `rect`),
  ...get(node, className, `circle`),
  ...get(node, className, `path`),
  ...get(node, className, `g`),
  ...get(node, className, `polygon`),
  ...get(node, className, `polyline`),
  ...get(node, className, `image`),
  ...get(node, className, `tspan`),
  ...get(node, className, `stop`),
  ...get(node, className, `text`),
];

function tempReplace(temp) {
  temp = `${Math.round(temp)}`
  let minus = ''
  if (temp.split(``)[0] == '-') {
    minus = '-'
    temp = temp.replace(`-`, ``)
  }
  if (temp.length < 2) {temp = 0 + temp}
  temp = minus + temp
  return temp
}

const addPic = async (elements, imageBuffer) => {
  await Promise.all(
    elements.map(async (element) => {
      let chatWidth = Number(element.getAttribute("width"));
      let chatHeight = Number(element.getAttribute("height"));
      let ratio = chatHeight / chatWidth;

      const { width, height } = sizeOf(imageBuffer);
      const imageRatio = height / width;

      let finalHeight;
      let finalWidth;

      if (ratio > imageRatio) {
        finalHeight = chatHeight;
        finalWidth = Math.round(chatHeight / imageRatio);
      } else {
        finalWidth = chatWidth;
        finalHeight = Math.round(chatWidth * imageRatio);
      }

      const resizedImage = await sharp(imageBuffer)
        .resize(finalWidth, finalHeight)
        .png()
        .toBuffer();

      const croppedImage = await sharp(resizedImage)
        .resize(chatWidth, chatHeight)
        .png()
        .toBuffer();

      element.setAttribute(
        `xlink:href`,
        `data:image/png;base64,${croppedImage.toString(`base64`)}`
      );
    })
  );
}

const fill = (node, hex) => {
  if (node.tagName === `stop`) {
    node.setAttribute(`stop-color`, hex);
  } else {
    node.setAttribute(`fill`, hex);
  }

  if (node.childNodes) {
    for (let child of Array.from(node.childNodes)) {
      if (child.setAttribute) {
        fill(child, hex);
      }
    }
  }
};

const picMake = async (weather, userPic, userName) => {
  if (browser === null) {
    await newBrowser()
  }
  console.time("picMake")
  const nameWeather = weather.weatherCoord.name
  weather = weather.weatherReply
  const weatherLength = weather.hourly.length
  for (let i = 0; weatherLength - i > 41; i++) {
    weather.hourly.pop()
  }
  const pic = parser.parseFromString(fs.readFileSync(`./svg.svg`, `utf8`));



  for (const element of getElements(pic, `top`)) {
    fill(element, COLORS[weather.current.weather[0].icon].top);
  }


  for (const element of getElements(pic, `bottom`)) {
    fill(element, COLORS[weather.current.weather[0].icon].bottom);
  }


  for (const element of getElements(pic, `deg`)) {
    element.setAttribute(`stroke`, COLORS[weather.current.weather[0].icon].bottom);
  }


  for (const element of getElements(pic, `back`)) {
    fill(element, COLORS[weather.current.weather[0].icon].back);
  }


  for (const element of getElements(pic, `user`)) {
    element.textContent = userName;
  }


  for (const element of getElements(pic, `time`)) {
    let today = new Date()
    today.setSeconds(today.getUTCSeconds() + weather.timezone_offset)
    const hh = tempReplace(today.getUTCHours())
    const mm = tempReplace(today.getUTCMinutes())
    const day = weekDays[today.getUTCDay()]
    const data = today.getUTCDate()
    const month = months[today.getUTCMonth()]
    const year = `${today.getUTCFullYear()}`.slice(0, -2)
    element.textContent = `${hh}:${mm} - ${day}, ${data} ${month} '${year}`;
  }


  for (const element of getElements(pic, `temp`)) {
    element.textContent = tempReplace(weather.current.temp);
  }


  for (const element of getElements(pic, `name`)) {
    element.textContent = nameWeather
  }


  for (const element of getElements(pic, `main`)) {
    element.textContent = weather.current.weather[0].main
  }

  const hourlyTempSort = []
  const hourlyTemp = []
  for (const hour in weather.hourly) {
    hourlyTemp.push(weather.hourly[hour].temp)
    hourlyTempSort.push(weather.hourly[hour].temp)
  }
  hourlyTempSort.sort((a, b) => a - b);
  const hourlyTempMax = hourlyTempSort[hourlyTempSort.length - 1]
  const hourlyTempMin = hourlyTempSort[0]
  const hourlyTempDifference = hourlyTempMax - hourlyTempMin
  const yOne = 70 / hourlyTempDifference
  const hourlyTempLength = hourlyTemp.length - 1
  let graphPoints = ''
  const xOne = 480 / hourlyTempLength
  let yMax = 0
  for (let i = 0; i < hourlyTemp.length; i++) {
    const y = 490 - (yOne * (hourlyTemp[i] - hourlyTempMin))
    const x = 1110 + (xOne * i)
    if (y > yMax) {yMax = y}
    if (graphPoints != '') {graphPoints += ' '}
    graphPoints += `${x},${y}`
    if (hoursClass.includes(i)) {
      const temp = `temp${i}`
      const time = `time${i}`
      for (const element of getElements(pic, temp)) {
        element.textContent = tempReplace(weather.hourly[i].temp)
        element.setAttribute(`x`, x + 15)
        element.setAttribute(`y`, y - 20)
      }
      for (const element of getElements(pic, `${temp}_deg`)) {
        element.setAttribute(`cx`, x + 15)
        element.setAttribute(`cy`, y - 30)
      }
      for (const element of getElements(pic, time)) {
        if (i == 0) {
          element.textContent = 'now'
        } else {
          let date = new Date(weather.hourly[i].dt * 1000 + weather.timezone_offset * 1000);
          element.textContent = date.toLocaleString("en-US", {hour: 'numeric'}).replace(" ", "").toLowerCase()
        }
      }
    }
  }
  const graphPointsFill = `1110,${yMax + 2} ${graphPoints} 1590,${yMax + 2}`
  for (const element of getElements(pic, `graph`)) {
    element.setAttribute(`points`, graphPoints)
  }
  for (const element of getElements(pic, `graph_fill`)) {
    element.setAttribute(`points`, graphPointsFill)
  }
  const picBack = fs.readFileSync(`./pic/${weather.current.weather[0].icon}.png`, `binary`);
  const backImageBuffer = Buffer.from(picBack, `binary`);
  const backPic = getElements(pic, "back_pic");
  await addPic(backPic, backImageBuffer)
  const userPicElement = getElements(pic, "user_pic");
  await addPic(userPicElement, userPic)
  console.timeEnd("picMake")

  const svg = pic.getElementsByTagName(`svg`)[0]
  const widthSvg = parseInt(svg.getAttribute('width'))
  const heightSvg = parseInt(svg.getAttribute('height'))

  const page = await browser.newPage();
  await page.setViewport({
    width: widthSvg + 8,
    height: heightSvg + 8,
    deviceScaleFactor: 0,
  });
  await page.goto(`file://${__dirname}/blank.html`);
  await page.setContent(`${serialize(pic)}`)
  const screen = await page.screenshot({
    clip:{
      x:8,
      y:8,
      width:widthSvg,
      height:heightSvg
    }
  });
  await page.close()
  return screen;
};

module.exports = {
  picMake,
};
