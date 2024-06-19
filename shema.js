import { DObjDiagramBase } from './DObjDiagramBase.js'

const DObjInstance = {
  'TDiagram': DObjDiagramBase,
  // другие типы и классы
};


var xmlDoc;

function Shema(){

  const shema = xmlDoc.querySelector('shema');

  this.InitShema = function(){
    this.contdiv = document.createElement('div');
    this.contdiv.style.width = shema.getAttribute('width') + 'px';
    this.contdiv.style.height = shema.getAttribute('height') + 'px';
    this.contdiv.style.backgroundColor = shema.getAttribute('bkcolor');
    document.body.appendChild(this.contdiv);
  };

}

async function XMLParse() {
  const response = await fetch('diag.xml');
  const xmlString = await response.text();
  const parser = new DOMParser();
  xmlDoc = parser.parseFromString(xmlString, "text/xml");
}

XMLParse().then(() => {
  const shema = new Shema();
  shema.InitShema();

  xmlDoc.querySelectorAll('object').forEach(object => {
    const type = object.getAttribute('type');
    const ObjClass = DObjInstance[type];
    const obj = new ObjClass();
    obj.CallDoInitObjBefore();
    obj.SetParamsFromXMLNode(object);
    obj.CallDoInitObjAfter();

    shema.contdiv.appendChild(obj.contdiv.background);
  });


}).catch(error => console.error('Ошибка при загрузке XML файла:', error));