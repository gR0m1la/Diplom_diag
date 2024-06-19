export function DObjDiagramBase (){
    var thisobj = this;

    this.SetParamsFromXMLNode = function(XMLNode) {

        function parseNode(node, obj) {
            // Итерируемся по дочерним узлам
            for (var i = 0; i < node.children.length; i++) {
                var child = node.children[i];
                var tagName = child.tagName;
                var textContent = child.textContent.trim();
                
                // Если узел имеет дочерние узлы, рекурсивно вызываем функцию для них
                if (child.children.length > 0) {
                    obj[tagName] = {};
                    parseNode(child, obj[tagName]);
                } else {
                    // Если узел содержит атрибуты, добавляем их к объекту
                    if (child.attributes.length > 0) {
                        obj[tagName] = {};
                        for (var j = 0; j < child.attributes.length; j++) {
                            var attribute = child.attributes[j];
                            obj[tagName][attribute.name] = attribute.value;
                        }
                    }
                    // Если узел имеет текстовое содержимое, присваиваем его к соответствующему свойству объекта
                    if (textContent !== "") {
                        obj[tagName] = textContent;
                    }
                }
            }
        }
        // Парсим XMLNode и заполняем объекты options, params и area
        parseNode(XMLNode.querySelector("options"), this.options);

        var paramsNode = XMLNode.querySelector("params");
        parseNode(XMLNode.querySelector("params"), this.params);

        for (var k = 0; k < XMLNode.attributes.length; k++) {
            var attribute = XMLNode.attributes[k];
            this.area[attribute.name] = attribute.value;
        }
        
        // Отдельно заполняем параметры в виде массива
        var parameters = Array.from(paramsNode.querySelectorAll('parameters parameter')).map(param => ({
            color: param.getAttribute('color'),
            value: parseInt(param.getAttribute('value')),
            name: param.getAttribute('name')
        }));
        this.params.parameters = parameters;
    };
    
    this.CallDoInitObjBefore = function(){
        this.options = {};
        this.params = {};
        this.area = {};
        this.bcont = 'canvas'
        this.contdiv = {};
    };

    this.CallDoInitObjAfter = function(){
        // Создаем и настраиваем холст
        this.contdiv.background = document.createElement('canvas');
        this.contdiv.background.width = this.area.width;
        this.contdiv.background.height = this.area.height;
        this.contdiv.background.style.backgroundColor = this.options.backgroundcolor;
        this.contdiv.background.style.left = this.area.cx + 'px';
        this.contdiv.background.style.top = this.area.cy + 'px';
        this.contdiv.background.style.position = 'absolute';
            
        var ctx = this.contdiv.background.getContext('2d');

        // Функция для затемнения или осветления цвета
        function darkenColor(color, amount) {
            // Парсим значение цвета
            var num = parseInt(color.slice(1), 16);
            
            // Получаем компоненты RGB
            var r = (num >> 16) - Math.round(255 * amount);
            var g = ((num >> 8) & 0x00FF) - Math.round(255 * amount);
            var b = (num & 0x0000FF) - Math.round(255 * amount);
        
            // Ограничиваем значения до диапазона [0, 255]
            r = Math.max(0, r);
            g = Math.max(0, g);
            b = Math.max(0, b);
        
            // Возвращаем затемненный цвет в формате HEX
            return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
        }

        var legendWidth = 0;
        if (this.options.showlegend == 1){
            var legendSquareSize = 15; // Размер квадрата в легенде
            var legendTextOffset = 7; // Отступ для текста имени параметра от квадрата

            var longest = "";
            this.params.parameters.forEach(function(parameter) {
                if (parameter.name.length > longest.length) {
                    longest = parameter.name;
                }
            });

            // Вычисляем размеры всей легенды
            legendWidth = ctx.measureText(longest).width + legendSquareSize + legendTextOffset + 15;
            var legendHeight = (legendSquareSize + legendTextOffset) * this.params.parameters.length;
        }

        //трехмерные параметры
        var scale = this.params.threeD.scale / 100; // Масштаб (1% - 500%)
        var perspective = this.params.threeD.perspective / 100; // Перспектива (0-100)
        var tilt = this.params.threeD.tilt * Math.PI / 180; // Наклон (270 - 360 градусов)
        var rotation = this.params.threeD.rotation * Math.PI / 180; // Поворот (0-360 градусов)
        var percent3D = this.params.threeD.percent; // Процент 3D (0-100)

        if (this.options.diagramform === "Pie") {

            // Суммируем значения параметров и нормализуем их до процентов
            var sum = 0;
            this.params.parameters.forEach(function(parameter) {
                sum += parameter.value;
            });
        
            this.params.parameters.forEach(function(parameter) {
                parameter.normalizedvalue = (parameter.value / sum) * 100;
            });

            var startAngle = 0;
        
            // Центр круговой диаграммы
            var centerX = this.contdiv.background.width / 2;
            var centerY = this.contdiv.background.height / 2;
            
            if (this.options.showlegend == 1){
                centerX -= legendWidth/2;
            }
            if (this.options.threeD == 1){
                centerY *= 0.9;
            }
            
            // Радиус круга (берем минимальное значение между половиной ширины и высоты холста)
            var radius = Math.min(centerX, centerY);

            if (this.options.showlabels == 1){
                radius *= 0.75;

            }
            if (this.options.threeD == 1){
                radius -= percent3D/2;
            }
        
            // Высота 3D-эффекта (глубина)
            var depth = radius * (percent3D / 100); // Регулируйте это значение для изменения высоты 3D

            // Применяем трансформации
            ctx.save(); // Сохраняем текущие трансформации
            ctx.translate(centerX, centerY);
            if (this.options.threeD == 1) {
                ctx.scale(scale, scale); // Масштабируем с учетом 3D-процента
                //ctx.rotate(rotation); // Поворачиваем холст
                // Применяем наклон по вертикали (перспективу)
                ctx.transform(1, 0, 0, Math.cos(tilt), 0, 0);
            }
            
            if (this.options.threeD == 1){
                // Рисуем боковые части секторов
                this.params.parameters.forEach(function(parameter) {
                    var endAngle = startAngle + (parameter.normalizedvalue / 100) * 2 * Math.PI;
            
                    // Координаты верхних и нижних точек сектора
                    var startXTop = radius * Math.cos(startAngle);
                    var startYTop = radius * Math.sin(startAngle);
                    var endXTop = radius * Math.cos(endAngle);
                    var endYTop = radius * Math.sin(endAngle);
                    var startXBottom = startXTop;
                    var startYBottom = startYTop + depth;
            
                    // Проверяем, находится ли сектор в нижней полуплоскости или пересекает её
                    if (startAngle < Math.PI && endAngle > Math.PI) {
                        // Сектор пересекает нижнюю полуплоскость
                        var midAngle = Math.PI;
                        var midXTop = radius * Math.cos(midAngle);
                        var midYTop = radius * Math.sin(midAngle);
                        var midXBottom = midXTop;
                        var midYBottom = midYTop + depth;
            
                        //Рисуем видимую часть нижнего полукруга от середины до конца
                        ctx.beginPath();
                        ctx.moveTo(midXTop, midYTop);
                        ctx.lineTo(midXBottom, midYBottom);
                        ctx.arc(0, depth, radius, midAngle, endAngle, false);
                        ctx.lineTo(endXTop, endYTop);
                        ctx.closePath();
                        ctx.fillStyle = darkenColor(parameter.color, 0.2);
                        ctx.fill();
                        ctx.lineWidth = 1;
                        ctx.strokeStyle = 'black';
                        ctx.stroke();
            
                        //Рисуем видимую нижнюю часть сектора от начала до середины
                        ctx.beginPath();
                        ctx.moveTo(startXTop, startYTop);
                        ctx.lineTo(startXBottom, startYBottom);
                        ctx.arc(0, depth, radius, startAngle, midAngle, false);
                        ctx.lineTo(midXTop, midYTop);
                        ctx.closePath();
                        ctx.fillStyle = darkenColor(parameter.color, 0.2);
                        ctx.fill();
                        ctx.lineWidth = 1;
                        ctx.strokeStyle = 'black';
                        ctx.stroke();

                    } else if (endAngle <= Math.PI) {
                        // Сектор полностью в нижней полуплоскости
                        ctx.beginPath();
                        ctx.moveTo(startXTop, startYTop);
                        ctx.lineTo(startXBottom, startYBottom);
                        ctx.arc(0, depth, radius, startAngle, endAngle, false);
                        ctx.lineTo(endXTop, endYTop);
                        ctx.closePath();
                        ctx.fillStyle = darkenColor(parameter.color, 0.2);
                        ctx.fill();
                        ctx.lineWidth = 1;
                        ctx.strokeStyle = 'black';
                        ctx.stroke();
                    }
            
                    startAngle = endAngle;
                });
                
                //Восстанавливаем начальный угол
                startAngle = 0;
            }
        
            //Рисуем верхние сектора
            this.params.parameters.forEach(function(parameter) {
                var endAngle = startAngle + (parameter.normalizedvalue / 100) * 2 * Math.PI;

                // Рисуем верхнюю часть сектора
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, radius, startAngle, endAngle);
                ctx.closePath();
                ctx.fillStyle = parameter.color;
                ctx.fill();
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'black';
                ctx.stroke();
        
                // Рисуем метки
                if (this.options.showlabels == 1) {
                    var label = parameter.name;
                    var labelWidth = ctx.measureText(label).width;
                    var labelHeight = 12;
                    var midAngle = (startAngle + endAngle) / 2;
                    var labelRadius = radius * 0.7;
        
                    var labelX = labelRadius * Math.cos(midAngle);
                    var labelY = labelRadius * Math.sin(midAngle);
        
                    ctx.beginPath();
                    ctx.moveTo(labelX, labelY);
                    var labelEndX = (radius + 20) * Math.cos(midAngle);
                    var labelEndY = (radius + 20) * Math.sin(midAngle);
                    ctx.lineTo(labelEndX, labelEndY);
                    ctx.strokeStyle = 'black';
                    ctx.stroke();
        
                    ctx.fillStyle = 'white';
                    ctx.fillRect(labelEndX - labelWidth / 2 - 5, labelEndY - labelHeight / 2 - 5, labelWidth + 10, labelHeight + 5);
        
                    ctx.strokeStyle = 'black';
                    ctx.strokeRect(labelEndX - labelWidth / 2 - 5, labelEndY - labelHeight / 2 - 5, labelWidth + 10, labelHeight + 5);
        
                    ctx.fillStyle = this.params.label.font.color;
                    ctx.font = `${this.params.label.font.size}px ${this.params.label.font.name}`;
                    ctx.textAlign = 'center';
                    ctx.fillText(label, labelEndX, labelEndY);
                }
        
                startAngle = endAngle;
            }, this);
        
            ctx.restore();
        }
        
        
        if (this.options.diagramform === "Bar") {
            var totalBars = this.params.parameters.length;
            var availableWidth = (this.contdiv.background.width - legendWidth) * 0.85; // Доступная ширина для отрисовки столбцов
            var maxValue = Math.max.apply(Math, this.params.parameters.map(function(param) { return param.value; }));
            var scaleRatio = (this.contdiv.background.height * 0.7) / maxValue; // Расчет коэффициента масштабирования на основе максимального значения
        
            // Определение нижнего и верхнего зазора
            var gapFromBottom = this.contdiv.background.height * 0.1; // Зазор снизу для оси X и меток
            var gapFromTop = this.contdiv.background.height * 0.1; // Зазор сверху для меток и заголовка
            var availableHeight = this.contdiv.background.height - gapFromBottom - gapFromTop;

            if(this.options.showaxesgrid == 1){
                // Позиционирование осей
                var axisBottom = this.contdiv.background.height - gapFromBottom - 10; // Позиция оси X
                var axisLeft = this.contdiv.background.width * 0.2 * 0.8 + 10; // Позиция оси Y
                availableHeight = this.contdiv.background.height - gapFromTop - (this.contdiv.background.height - axisBottom);
                availableWidth -= axisLeft;
            }
            else{
                // Если оси и сетка не отображаются, увеличиваем доступное пространство для столбцов
                var axisBottom = this.contdiv.background.height * 0.95;
                var axisLeft = this.contdiv.background.width * 0.07; // Уменьшаем отступ слева
            }

            // Перемещение центра координат в центр холста
            var centerX = this.contdiv.background.width / 2;
            var centerY = this.contdiv.background.height / 2;
        
            if (this.options.barcharttype == "Vertical"){
                var barWidth = Math.floor(availableWidth / totalBars); // Расчет ширины каждого столбца
                if (totalBars > 1){
                    var spacing = 10 + Math.floor((availableWidth - barWidth * totalBars) / (totalBars - 1)); // Расчет промежутка между столбцами
                } else {
                    var spacing = 10;
                }
                // Проверка, чтобы ширина столбцов и промежутков не превышала ширину или высоту фона
                if ((barWidth + spacing) * totalBars > availableWidth) {
                    var reductionFactor = availableWidth / ((barWidth + spacing) * totalBars);
                    barWidth *= reductionFactor;
                    spacing *= reductionFactor;
                }
            } else if (this.options.barcharttype == "Horizontal"){
                var barWidth = Math.floor(availableHeight / totalBars); // Расчет ширины каждого столбца
                var spacing = 10 + Math.floor((availableHeight - barWidth * totalBars) / (totalBars - 1)); // Расчет промежутка между столбцами
                if ((barWidth + spacing) * (totalBars + 1) > availableHeight) {
                    var reductionFactor = availableHeight / ((barWidth + spacing) * (totalBars + 1));
                    barWidth *= reductionFactor;
                    spacing *= reductionFactor;
                }
            }

            var depth = barWidth / 2 * percent3D / 100; // Глубина 3D-эффекта

            // Применяем трансформации
            ctx.save(); // Сохраняем текущие трансформации
            ctx.translate(centerX, centerY);

            if (this.options.threeD == 1) {
                ctx.scale(scale, scale); // Масштабируем с учетом 3D-процента            
            }
            ctx.translate(-centerX, -centerY);

            // Проверка отображения осей
            if (this.options.showaxesgrid == 1) {
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 2;
                if (this.options.threeD == 1) {
                    // Рисуем объемные оси X и Y
                    // Ось X
                    ctx.fillStyle = 'lightgray';
                    ctx.beginPath();
                    ctx.moveTo(axisLeft, axisBottom); // Начало оси
                    ctx.lineTo(axisLeft*1.25 + availableWidth, axisBottom); // Горизонтальная линия оси
                    ctx.lineTo(axisLeft*1.25 + availableWidth + depth, axisBottom - depth); // Линия глубины 3D эффекта
                    ctx.lineTo(axisLeft + depth, axisBottom - depth); // Линия к исходной точке
                    ctx.closePath();
                    ctx.fill();
                    ctx.strokeStyle = 'black';
                    ctx.stroke();
            
                    // Ось Y
                    ctx.fillStyle = 'lightgray';
                    ctx.beginPath();
                    ctx.moveTo(axisLeft, axisBottom); // Начало оси
                    ctx.lineTo(axisLeft, (axisBottom - availableHeight)); // Вертикальная линия оси
                    ctx.lineTo(axisLeft + depth, (axisBottom - availableHeight) - depth); // Линия глубины 3D эффекта
                    ctx.lineTo(axisLeft + depth, axisBottom - depth); // Линия к исходной точке
                    ctx.closePath();
                    ctx.fill();
                    ctx.strokeStyle = 'black';
                    ctx.stroke();

                } else {
                    // Плоские оси          
                    // Ось X
                    ctx.beginPath();
                    ctx.moveTo(axisLeft, axisBottom);
                    ctx.lineTo(axisLeft * 1.25 + availableWidth, axisBottom);
                    ctx.stroke();
            
                    // Ось Y
                    ctx.beginPath();
                    ctx.moveTo(axisLeft, axisBottom);
                    ctx.lineTo(axisLeft, axisBottom - availableHeight);
                    ctx.stroke();
                }

                // Подписи к осям Y и сетка
                if (this.options.barcharttype == "Horizontal"){
                    for (var j = 0; j < totalBars; j++) {
                        var y = axisBottom - j * (barWidth + spacing) - barWidth / 2 - 2 * spacing;
                        ctx.fillStyle = 'black';
                        ctx.font = '12px Arial';
                        ctx.fillText(j.toString(), axisLeft- 20, y+3); 
                        ctx.beginPath();
                        console.log(axisBottom + " " + y);
                        ctx.moveTo(axisLeft, y); 
                        ctx.lineTo(axisLeft-5, y);
                        ctx.strokeStyle = 'black';
                        ctx.stroke();
                    }
                }
                if (this.options.barcharttype == "Vertical"){
                    var stepY = Math.round(maxValue / 10);
                    for (var i = 0; i <= maxValue + stepY; i += stepY) {
                        var y = axisBottom - (i * scaleRatio);
                        ctx.fillStyle = 'black';
                        ctx.font = '12px Arial';
                        ctx.fillText(i.toString(), axisLeft - 30, y + 3); 
                        ctx.beginPath();
                        ctx.moveTo(axisLeft - 5, y); 
                        ctx.lineTo(axisLeft, y);
                        ctx.lineWidth = 2;
                        ctx.strokeStyle = 'black';
                        ctx.stroke();
                        if (this.options.threeD == 1 && i != 0) {
                            ctx.beginPath();
                            ctx.moveTo(axisLeft, y);
                            ctx.lineTo(axisLeft + depth, y - depth);
                            ctx.lineTo(axisLeft * 1.25 + availableWidth + depth, y - depth);
                            ctx.lineWidth = 1;
                            ctx.strokeStyle = 'gray';
                            ctx.stroke();
                        }
                        else if (this.options.threeD == 0 && i != 0){
                            ctx.beginPath();
                            ctx.moveTo(axisLeft, y);
                            ctx.lineTo(axisLeft * 1.25 + availableWidth, y);
                            ctx.lineWidth = 1;
                            ctx.strokeStyle = 'gray';
                            ctx.stroke();
                        }
                    }
                }
                // Подписи к осям X
                if (this.options.barcharttype == "Horizontal"){
                    var stepX = Math.round(maxValue / 10);
                    for (var i = 0; i <= maxValue + stepX; i += stepX) {
                        var x = axisLeft + (i * scaleRatio);
                        ctx.fillStyle = 'black';
                        ctx.font = '12px Arial';
                        ctx.fillText(i.toString(), x - 3, axisBottom + 20); 
                        ctx.beginPath();
                        ctx.moveTo(x, axisBottom); 
                        ctx.lineTo(x, axisBottom + 5);
                        ctx.lineWidth = 2;
                        ctx.strokeStyle = 'black';
                        ctx.stroke();
                        if (this.options.threeD == 1 && i != 0) {
                            ctx.beginPath();
                            ctx.moveTo(x, axisBottom);
                            ctx.lineTo(x + depth, axisBottom - depth);
                            ctx.lineTo(x + depth, axisBottom - availableHeight);
                            ctx.lineWidth = 1;
                            ctx.strokeStyle = 'gray';
                            ctx.stroke();
                        }
                        else if (this.options.threeD == 0 && i != 0){
                            ctx.beginPath();
                            ctx.moveTo(x, axisBottom);
                            ctx.lineTo(x, axisBottom - availableHeight);
                            ctx.lineWidth = 1;
                            ctx.strokeStyle = 'gray';
                            ctx.stroke();
                        }
                    }
                }
                if (this.options.barcharttype == "Vertical"){
                    for (var j = 0; j < totalBars; j++) {
                        var x = axisLeft*1.25 + j * (barWidth + spacing) + barWidth / 2;
                        ctx.fillStyle = 'black';
                        ctx.font = '12px Arial';
                        ctx.fillText(j.toString(), x - 3, axisBottom + 20); 
                        ctx.beginPath();
                        ctx.moveTo(x, axisBottom); 
                        ctx.lineTo(x, axisBottom + 5);
                        ctx.strokeStyle = 'black';
                        ctx.stroke();
                    }
                }
            }

            // Перебор параметров и отрисовка каждого столбца
            this.params.parameters.forEach(function(parameter, index) {
                ctx.lineWidth = 1;
                var barHeight = parameter.value * scaleRatio;

                if(this.options.barcharttype == "Horizontal"){
                    var startX = axisLeft;
                    var startY = axisBottom - (index+1) * (barWidth + spacing) - spacing;
                    ctx.fillStyle = parameter.color;
                    ctx.fillRect(startX, startY, barHeight, barWidth);
                    ctx.strokeStyle = 'black';
                    ctx.strokeRect(startX, startY, barHeight, barWidth);

                    if (this.options.threeD == 1) {
                        // Рисуем верхнюю часть столбца
                        ctx.beginPath();
                        ctx.moveTo(startX, startY);
                        ctx.lineTo(startX + depth, startY - depth);
                        ctx.lineTo(startX + depth + barHeight, startY - depth);
                        ctx.lineTo(startX + barHeight, startY);
                        ctx.closePath();
                        ctx.fillStyle = darkenColor(parameter.color, 0.3);
                        ctx.fill();
                        ctx.strokeStyle = 'black';
                        ctx.stroke();
                        
                        // Рисуем боковую часть столбца
                        ctx.beginPath();
                        ctx.moveTo(startX + barHeight, startY);
                        ctx.lineTo(startX + + barHeight + depth, startY - depth);
                        ctx.lineTo(startX + barHeight + depth, startY + barWidth- depth);
                        ctx.lineTo(startX + barHeight, startY + barWidth);
                        ctx.closePath();
                        ctx.fillStyle = darkenColor(parameter.color, 0.3);
                        ctx.fill();
                        ctx.strokeStyle = 'black';
                        ctx.stroke();
                    }
                }
                if(this.options.barcharttype == "Vertical"){
                    var startX = axisLeft*1.25 + index * (barWidth + spacing);
                    var startY = axisBottom - barHeight;
                    console.log(barWidth + " " + spacing);
                    ctx.fillStyle = parameter.color;
                    ctx.fillRect(startX, startY, barWidth, barHeight);
                    ctx.strokeStyle = 'black';
                    ctx.strokeRect(startX, startY, barWidth, barHeight);

                    // Рисуем переднюю часть столбца
                    if (this.options.threeD == 1) {
                        
                        // Рисуем боковую часть столбца
                        ctx.beginPath();
                        ctx.moveTo(startX + barWidth, axisBottom - barHeight);
                        ctx.lineTo(startX + barWidth + depth, axisBottom - barHeight - depth);
                        ctx.lineTo(startX + barWidth + depth, axisBottom - depth);
                        ctx.lineTo(startX + barWidth, axisBottom);
                        ctx.closePath();
                        ctx.fillStyle = darkenColor(parameter.color, 0.3);
                        ctx.fill();
                        ctx.strokeStyle = 'black';
                        ctx.stroke();
                        
                        // Рисуем верхнюю часть столбца
                        ctx.beginPath();
                        ctx.moveTo(startX, axisBottom - barHeight);
                        ctx.lineTo(startX + depth, axisBottom - barHeight - depth);
                        ctx.lineTo(startX + barWidth + depth, axisBottom - barHeight - depth);
                        ctx.lineTo(startX + barWidth, axisBottom - barHeight);
                        ctx.closePath();
                        ctx.fillStyle = darkenColor(parameter.color, 0.3);
                        ctx.fill();
                        ctx.strokeStyle = 'black';
                        ctx.stroke();
                    } else {

                    }
                }

                // Отрисовка метки сверху столбца
                if (this.options.showlabels == 1) {

                    var label = parameter.value.toFixed(1);
                    var labelHeight = parseInt(this.params.label.font.size);
                    var labelWidth = ctx.measureText(label).width;
                    if(this.options.barcharttype == "Vertical"){
                        var labelX = startX + barWidth / 2;
                        var labelY = axisBottom - barHeight - 10; // Место для метки
                    }
                    if(this.options.barcharttype == "Horizontal"){
                        var labelX = startX + barHeight + labelWidth;
                        var labelY = startY + barWidth / 2; // Место для метки
                    }

                    ctx.fillStyle = 'white';
                    ctx.fillRect(labelX - labelWidth / 2 - 4, labelY - labelHeight / 2 - 5, labelWidth + 8, labelHeight + 3);
                    ctx.strokeStyle = 'black';
                    ctx.strokeRect(labelX - labelWidth / 2 - 4, labelY - labelHeight / 2 - 5, labelWidth + 8, labelHeight + 3);
                    ctx.fillStyle = this.params.label.font.color;
                    ctx.font = `${this.params.label.font.size}px ${this.params.label.font.name}`;
                    ctx.textAlign = 'center';
                    ctx.fillText(label, labelX, labelY);
                }
            }, this);
        
            ctx.restore(); // Восстанавливаем сохраненные трансформации
        }
        if (this.options.showlegend == 1){
            var legendX = (this.contdiv.background.width - legendWidth)*0.95; // Начальная позиция X для легенды
            var legendY = this.contdiv.background.height* 0.1; // Начальная позиция Y для легенды

            // Рисуем белый фон для легенды
            ctx.fillStyle = this.params.legend.backgroundcolor;
            ctx.fillRect(legendX - 5, legendY - 5, legendWidth + 5, legendHeight + 5);
            
            // Рисуем тень для рамки вокруг легенды
            ctx.shadowColor = this.params.legend.shadowcolor;
            ctx.shadowBlur = 4; // Размытие тени
            ctx.shadowOffsetX = 3; // Смещение тени по оси X
            ctx.shadowOffsetY = 3; // Смещение тени по оси Y

            // Рисуем рамку вокруг легенды
            ctx.strokeStyle = this.params.legend.bordercolor;
            ctx.strokeRect(legendX - 5, legendY - 5, legendWidth + 5, legendHeight + 5);

            // Сбрасываем настройки тени
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            this.params.parameters.forEach(function(parameter, index) {
                var squareX = legendX;
                var squareY = legendY + index * (legendSquareSize + legendTextOffset);
                
                // Рисуем квадратик цвета параметра
                ctx.fillStyle = parameter.color;
                ctx.fillRect(squareX, squareY, legendSquareSize, legendSquareSize);
                ctx.strokeStyle = this.params.legend.bordercolor;
                ctx.strokeRect(squareX, squareY, legendSquareSize, legendSquareSize);
                
                // Рисуем имя параметра рядом с квадратиком
                ctx.fillStyle = this.params.legend.font.color;
                ctx.font = `${this.params.legend.font.size}px ${this.params.label.font.name}`;
                ctx.textAlign = 'left';
                ctx.fillText(parameter.name, squareX + legendSquareSize + legendTextOffset + 5, squareY + legendSquareSize - 3);
            }, this);
        }
        if (this.options.showtitle == 1){
            ctx.fillStyle = this.params.title.font.color;
            ctx.font = `${this.params.title.font.size}px ${this.params.title.font.name}`;
            ctx.textAlign = this.params.title.alignment;
            ctx.fillText(this.params.title.text, this.contdiv.background.width/2, this.contdiv.background.height/15);
        }
    };
}