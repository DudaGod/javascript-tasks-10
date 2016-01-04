'use strict';

(function () {
    /**
    * Base class for Library, Formula, FormulaResult
    * @constructor
    */
    function Common() {}
    Common.prototype = {
        /**
        * @param {HTMLElement} element
        * @returns {boolean}
        */
        isElementWithin: function isElementWithin(element) {
            return this._container === element.parentElement;
        },
        /**
        * @returns {boolean}
        */
        isContainerClear: function isContainerClear() {
            return this._container.firstChild === null;
        },
        /**
        * @param {HTMLElement} element
        */
        addElement: function addElement(element) {
            this._container.appendChild(element);
        },
        /**
        * @param {HTMLElement} element
        */
        removeElement: function removeElement(element) {
            this._container.removeChild(element);
        },
        /**
        * remove all child elements
        */
        clearContainer: function clearContainer() {
            while (this._container.firstChild) {
                this.removeElement(this._container.firstChild);
            }
        },
        /**
        * @returns {Array.<HTMLElement>}
        */
        getRenderedElements: function getRenderedElements() {
            return [].slice.apply(this._container.children);
        },
        /**
        * @param {string} className
        * @returns {Array.<string>}
        */
        getNamesRenderedElements: function getNamesRenderedElements(className) {
            if (this.isContainerClear()) {
                return [];
            }
            var renderedElements = this.getRenderedElements();
            var names = renderedElements.filter(function (item) {
                return item.classList.contains(className);
            }).map(function (item) {
                return item.dataset.element;
            });
            return names;
        }
    };

    /**
    * List of available alchemical elements
    * @constructor
    */
    var Library = function Library() {
        this._container = document.querySelector('.library__elements');
        this._elements = [];
        this._timer = null;
        this._onMouseWheel = this._onMouseWheel.bind(this);
    };
    /**
    * Inherit from Common
    */
    Library.prototype = Object.create(Common.prototype);
    Library.prototype.constructor = Library;
    /**
    * @param {string} jsonUrl
    */
    Library.prototype.loadInfo = function (jsonUrl) {
        loadJSON(jsonUrl, (function (loadedElements) {
            this._elements = loadedElements;
            this.renderElements();
            var mousewheelEvt = isFirefox() ? 'DOMMouseScroll' : 'mousewheel';
            this._container.addEventListener(mousewheelEvt, this._onMouseWheel);
        }).bind(this));
    };
    /**
    * Render all elements with inLibrary flag
    */
    Library.prototype.renderElements = function () {
        var elementsFragment = document.createDocumentFragment();
        this._elements.filter(function (item) {
            return item.inLibrary;
        }).sort(function (a, b) {
            if (a.name > b.name) {
                return 1;
            } else if (a.name < b.name) {
                return -1;
            }
            return 0;
        }).forEach(function (item) {
            var elem = new Element(item.name);
            elementsFragment.appendChild(elem.getElementNode());
            elem.loadImg(item.url);
        });
        this._container.appendChild(elementsFragment);
    };
    /**
    * @param {number} displacement
    */
    Library.prototype.scrollElements = function (displacement) {
        var curY = this._container.style.transform.match(/-?\d+/);
        displacement = curY ? Number(curY[0]) + displacement : displacement;
        this._container.style.transform = "translateY(" + displacement + "px)";
    };
    /**
    * Find url on element which has got a name in func argument
    * @param {string} name
    * @returns {string|null}
    */
    Library.prototype.getUrlByName = function (name) {
        var i = 0;
        for (; i < this._elements.length; i++) {
            if (this._elements[i].name === name) {
                break;
            }
        }
        return this._elements[i].url ? this._elements[i].url : null;
    };
    /**
    * @param {HTMLElement} element
    */
    Library.prototype.addElement = function (element) {
        var renderedElements = this.getRenderedElements();
        var i = 0;
        while (renderedElements.length > i && renderedElements[i].dataset.element < element.dataset.element) {
            i++;
        }
        this._container.insertBefore(element, renderedElements[i]);
    };
    /**
    * Highlight name of the elements which match to the filter input
    */
    Library.prototype.highlightElements = function () {
        var filterVal = filter.getFilterValue();
        var regExp = new RegExp('^(' + filterVal + ')', 'gi');
        var renderedElements = this.getRenderedElements();
        renderedElements.forEach(function (item) {
            if (!(item.dataset.element.search(regExp) + 1)) {
                item.classList.add('hidden');
            } else {
                item.classList.remove('hidden');
                var elementName = item.querySelector('.element__name');
                elementName.innerHTML = filterVal.length ? elementName.textContent.replace(regExp, '<b>$1</b>') : elementName.textContent;
            }
        });
    };
    /**
    * Event handler of mouse wheel
    * @param {Event} event
    * @private
    */
    Library.prototype._onMouseWheel = function (event) {
        var displacement = this.getRenderedElements()[0].offsetHeight;
        var maxTop = filter.getHeight();
        var libraryClientRect = this._container.getBoundingClientRect();
        var delta = event.detail ? event.detail * -120 : event.wheelDelta;

        clearTimeout(this._timer);
        this._timer = delta > 0 ? setTimeout((function () {
            if (maxTop <= libraryClientRect.top) {
                return;
            }
            maxTop > libraryClientRect.top + displacement ? this.scrollElements(displacement) : this.scrollElements(maxTop - libraryClientRect.top);
        }).bind(this), 66) : setTimeout((function () {
            if (window.innerHeight >= libraryClientRect.bottom) {
                return;
            }
            window.innerHeight < libraryClientRect.bottom - displacement ? this.scrollElements(-displacement) : this.scrollElements(window.innerHeight - libraryClientRect.bottom);
        }).bind(this), 66);
    };

    /**
    * @constructor
    */
    var Formula = function Formula() {
        this._container = document.querySelector('.workspace__formula');
        this._formulas = [];
    };
    /**
    * Inherit from Common
    */
    Formula.prototype = Object.create(Common.prototype);
    Formula.prototype.constructor = Formula;
    /**
    * @param {string} jsonUrl
    */
    Formula.prototype.loadInfo = function (jsonUrl) {
        loadJSON(jsonUrl, (function (loadedFormulas) {
            this._formulas = loadedFormulas;
        }).bind(this));
    };
    /**
    * @param {HTMLElement} element
    */
    Formula.prototype.addElement = function (element) {
        if (!this._container.childElementCount) {
            Common.prototype.addElement.call(this, element);
            this.calculate();
            return;
        }
        var plus = document.createElement('span');
        plus.classList.add('workspace__formula-plus');
        Common.prototype.addElement.call(this, plus);
        Common.prototype.addElement.call(this, element);
        this.calculate();
    };
    /**
    * @param {HTMLElement} element
    */
    Formula.prototype.removeElement = function (element) {
        if (this._container.childElementCount < 2) {
            Common.prototype.removeElement.call(this, element);
            this.calculate();
            return;
        }
        Common.prototype.removeElement.call(this, element);
        this.removeRedundantPluses();
    };
    /**
    * Remove spare pluses between elements or on the edges
    */
    Formula.prototype.removeRedundantPluses = function () {
        var _this = this;

        var pluses = this.getRenderedElements();
        pluses.filter(function (item) {
            return item.classList.contains('workspace__formula-plus');
        }).forEach(function (item) {
            if (item === _this._container.firstElementChild || item === _this._container.lastElementChild || item.className === item.nextElementSibling.className) {
                _this._container.removeChild(item);
            }
        });
        this.calculate();
    };
    /**
    * Calculate formula and display the result
    */
    Formula.prototype.calculate = function () {
        var elementsNames = this.getNamesRenderedElements('element');

        if (this.isContainerClear() || elementsNames.length < 2) {
            formulaRes.clearContainer();
            formulaRes.reset();
            return;
        }

        var formulas = this._formulas.filter(function (item) {
            return item.elements.length <= elementsNames.length;
        }).sort(function (a, b) {
            if (a.elements.length > b.elements.length) {
                return -1;
            } else if (a.elements.length < b.elements.length) {
                return 1;
            }
            return 0;
        });

        var resultName = null;
        var prevRes = false;
        var prevFormulaElements = formulaRes.getFormulaElements();

        if (prevFormulaElements.length) {
            prevRes = prevFormulaElements.every(function (item) {
                return Boolean(elementsNames.indexOf(item) + 1);
            });
        }

        for (var i = 0; i < formulas.length; i++) {
            var answ = formulas[i].elements.every(function (item) {
                return Boolean(elementsNames.indexOf(item) + 1);
            });
            if (answ && (formulas[i].elements.length !== prevFormulaElements.length || !prevRes)) {
                formulaRes.setFormulaElements(formulas[i].elements);
                resultName = formulas[i].result;
                break;
            } else if (!answ) {
                continue;
            }
            break;
        }

        if (!resultName && !prevRes) {
            formulaRes.clearContainer();
            formulaRes.reset();
            return;
        } else if (!resultName) {
            return;
        }

        var elem = new Element(resultName);
        formulaRes.setResultElement(elem.getElementNode());
        var url = library.getUrlByName(resultName);
        elem.loadImg(url, false);
    };

    /**
    * @constructor
    */
    var FormulaResult = function FormulaResult() {
        this._container = document.querySelector('.workspace__result');
        this._resultElement = null;
        this._formulaElements = [];
    };
    /**
    * Inherit from Common
    */
    FormulaResult.prototype = Object.create(Common.prototype);
    FormulaResult.prototype.constructor = FormulaResult;
    /**
    * Come back to default
    */
    FormulaResult.prototype.reset = function () {
        this._resultElement = null;
        this._formulaElements = [];
    };
    /**
    * Returns array with names of elements in the Formula area
    * @returns {Array.<string>}
    */
    FormulaResult.prototype.getFormulaElements = function () {
        return this._formulaElements;
    };
    /**
    * Leave result Element unchanged if formula isn't changing to more difficult
    * @param {Array.<string>} arr
    */
    FormulaResult.prototype.setFormulaElements = function (arr) {
        this._formulaElements = arr;
    };
    /**
    * @returns {HTMLElement|null}
    */
    FormulaResult.prototype.getResultElement = function () {
        return this._resultElement;
    };
    /**
    * @param {HTMLElement} element
    */
    FormulaResult.prototype.setResultElement = function (element) {
        if (!this.getResultElement()) {
            this.addElement(element);
        } else {
            this._container.replaceChild(element, this._resultElement);
        }
        this._resultElement = element;
    };
    /**
    * @param {HTMLElement} element
    */
    FormulaResult.prototype.addElement = function (element) {
        if (this.isContainerClear()) {
            var arrow = document.createElement('span');
            arrow.classList.add('workspace__result-arrow');
            Common.prototype.addElement.call(this, arrow);
        }
        Common.prototype.addElement.call(this, element);
    };

    /**
    * @param {string} newName
    * @constructor
    */
    var Element = function Element(newName) {
        this._elementTemplate = document.getElementById('element-template');
        this._element = this._elementTemplate.content.children[0].cloneNode(true);
        this._elementName = this._element.querySelector('.element__name');
        this._elementImg = this._element.querySelector('img');
        this._elementName.textContent = newName;
        this._element.dataset.element = newName;
        this._onElementImgClick = this._onElementImgClick.bind(this);
    };
    Element.prototype = {
        /**
        * @param {string} url
        * @param {boolean} addEvent
        */
        loadImg: function loadImg(url, addEvent) {
            var _this2 = this;

            addEvent = typeof addEvent === 'undefined' ? true : addEvent;
            var img = new Image();
            img.src = url;
            img.classList.add('element__img');

            img.addEventListener('load', function () {
                _this2._element.replaceChild(img, _this2._elementImg);
                _this2._elementImg = img;
                if (addEvent) {
                    _this2._elementImg.addEventListener('click', _this2._onElementImgClick);
                }
            });
            img.addEventListener('error', function () {
                _this2._elementImg.classList.add('element__img', 'img-load-failure');
                if (addEvent) {
                    _this2._elementImg.addEventListener('click', _this2._onElementImgClick);
                }
            });
        },
        /**
        * @returns {HTMLElement}
        */
        getElementNode: function getElementNode() {
            return this._element;
        },
        /**
        * @param {Event} event
        * @private
        */
        _onElementImgClick: function _onElementImgClick(event) {
            event.preventDefault();
            if (isFirefox() && this._element.classList.contains('noclick')) {
                this._element.classList.remove('noclick');
                return;
            }
            var imgClickEvent = new CustomEvent('imgElementClick', { detail: { element: this._element } });
            window.dispatchEvent(imgClickEvent);
        }
    };

    /**
    * @constructor
    */
    var Filter = function Filter() {
        this._filterInput = document.getElementById('filter');
        this._filterClear = document.querySelector('.filter__clear');
        this._onInputEnterText = this._onInputEnterText.bind(this);
        this._onClearClick = this._onClearClick.bind(this);
        this._filterInput.addEventListener('input', this._onInputEnterText);
        this._filterClear.addEventListener('click', this._onClearClick);
    };

    Filter.prototype = {
        /**
        * @returns {number}
        */
        getHeight: function getHeight() {
            var styles = window.getComputedStyle(this._filterInput.parentElement);
            var margin = parseInt(styles.marginTop) + parseInt(styles.marginBottom);
            return this._filterInput.offsetHeight + margin;
        },
        /**
        * @returns {string}
        */
        getFilterValue: function getFilterValue() {
            return this._filterInput.value;
        },
        /**
        * @returns {boolean}
        */
        isFilterInputClear: function isFilterInputClear() {
            return !this._filterInput.value.length;
        },
        /**
        * Event handler of input any symbol in input area
        * @private
        */
        _onInputEnterText: function _onInputEnterText() {
            this._filterInput.value.length ? this._filterClear.classList.remove('hidden') : this._filterClear.classList.add('hidden');
            library.highlightElements();
        },
        /**
        * Event handler of click on cross
        * @param {Event} event
        * @private
        */
        _onClearClick: function _onClearClick(event) {
            event.preventDefault();
            this._filterInput.value = '';
            this._filterInput.dispatchEvent(new Event('input'));
        }
    };

    /**
    * Singleton for drag and drop elements
    */
    var dragAndDrop = new function () {
        var dragObj = {};
        /**
        * Event handler of hold down the left mouse button
        * @param {Event} event
        */
        function onMouseDown(event) {
            if (event.which !== 1) {
                return;
            }
            dragObj.elementImg = event.target.closest('.element__img');
            if (!dragObj.elementImg || dragObj.elementImg.closest('.workspace__result')) {
                return;
            }
            dragObj.element = dragObj.elementImg.closest('.element');
            dragObj.downX = event.pageX;
            dragObj.downY = event.pageY;

            event.preventDefault();
        }
        /**
        * Event handler of moving a mouse
        * @param {Event} event
        */
        function onMouseMove(event) {
            if (!dragObj.element) {
                return;
            }
            if (!dragObj.isDragStart) {
                dragObj.lastNextSibling = dragObj.element.nextSibling;
                dragObj.lastParent = dragObj.element.parentNode;
                var moveX = event.pageX - dragObj.downX;
                var moveY = event.pageY - dragObj.downY;
                if (Math.abs(moveX) < 5 && Math.abs(moveY) < 5) {
                    return;
                }
                var coords = getCoords(dragObj.element);
                var prevImgSizes = getSizes(dragObj.elementImg);
                dragObj.shiftX = dragObj.downX - coords.left;
                dragObj.shiftY = dragObj.downY - coords.top;
                startDrag();
                var currImgSizes = getSizes(dragObj.elementImg);
                if (currImgSizes.width !== prevImgSizes.width || currImgSizes.height !== prevImgSizes.height) {
                    dragObj.shiftX += (currImgSizes.width - prevImgSizes.width) / 2;
                    dragObj.shiftY += (currImgSizes.height - prevImgSizes.height) / 2;
                }
            }
            dragObj.element.style.left = event.pageX - dragObj.shiftX + 'px';
            dragObj.element.style.top = event.pageY - dragObj.shiftY + 'px';

            event.preventDefault();
        }
        /**
        * Event handler of the end of hold left mouse button
        * @param event
        */
        function onMouseUp(event) {
            if (dragObj.isDragStart) {
                finishDrag(event);
            }
            dragObj = {};
        }
        /**
        * Beginning of the dragging element
        */
        function startDrag() {
            if (isFirefox()) {
                dragObj.element.classList.add('noclick');
            }
            dragObj.element.classList.add('element--drag');
            dragObj.elementImg.classList.add('element__img--drag');
            document.body.appendChild(dragObj.element);
            dragObj.element.style.position = 'absolute';
            dragObj.isDragStart = true;
        }
        /**
        * Beginning of the end of the dragging element
        * @param {Event} event
        */
        function finishDrag(event) {
            dragObj.dropElem = findDroppable(event);
            if (!dragObj.dropElem) {
                rollback();
            } else {
                onDragEnd();
            }
        }
        /**
        * Cancel dragging and return element to the previous position
        */
        function rollback() {
            dragObj.lastParent.insertBefore(dragObj.element, dragObj.lastNextSibling);
            resetElementStyle();
        }
        /**
        * The end of the dragging element
        */
        function onDragEnd() {
            resetElementStyle();
            var elementName = dragObj.element.querySelector('.element__name');
            if (isLibraryParent()) {
                if (elementName.getElementsByTagName('b')) {
                    elementName.innerHTML = elementName.textContent;
                }
                formula.addElement(dragObj.element);
                return;
            }
            formula.removeRedundantPluses();
            library.addElement(dragObj.element);
            if (!filter.isFilterInputClear()) {
                library.highlightElements();
            }
        }

        /**
        * Find drop container
        * @param {Event} event
        * @returns {HTMLElement|null}
        */
        function findDroppable(event) {
            dragObj.element.classList.add('hidden');
            var elem = document.elementFromPoint(event.clientX, event.clientY);
            dragObj.element.classList.remove('hidden');
            if (elem === null) {
                return null;
            }
            if (isLibraryParent()) {
                return elem.closest('.workspace');
            }
            return elem.closest('.library');
        }
        function resetElementStyle() {
            dragObj.element.classList.remove('element--drag');
            dragObj.elementImg.classList.remove('element__img--drag');
            dragObj.element.style.position = 'static';
        }
        /**
        * @param {HTMLElement} elem
        * @returns {{top: Number, left: Number}}
        */
        function getCoords(elem) {
            var box = elem.getBoundingClientRect();
            return {
                top: box.top,
                left: box.left
            };
        }
        /**
        * Returns sizes of the Image
        * @param {HTMLElement} elem
        * @returns {{width: Number, height: Number}}
        */
        function getSizes(elem) {
            var styles = window.getComputedStyle(elem);
            return {
                width: parseInt(styles.width),
                height: parseInt(styles.height)
            };
        }
        /**
        * @returns {boolean}
        */
        function isLibraryParent() {
            return dragObj.lastParent.classList.contains('library__elements');
        }
        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }();

    /**
    * @param {string} url
    * @param {Function} callback
    */
    function loadJSON(url, callback) {
        fetch(url).then(function (response) {
            if (response.status >= 200 && response.status < 300) {
                return Promise.resolve(response.json());
            } else {
                return Promise.reject(new Error(response.statusText));
            }
        }).then(function (data) {
            callback(data);
        })['catch'](function (error) {
            console.log("Failed", error);
        });
    }

    function initEvents() {
        window.addEventListener('imgElementClick', function (event) {
            var element = event.detail.element;
            var elementName = element.querySelector('.element__name');
            if (library.isElementWithin(element)) {
                library.removeElement(element);
                if (elementName.getElementsByTagName('b')) {
                    elementName.innerHTML = elementName.textContent;
                }
                formula.addElement(element);
            } else if (formula.isElementWithin(element)) {
                formula.removeElement(element);
                library.addElement(element);
                if (!filter.isFilterInputClear()) {
                    library.highlightElements();
                }
            }
        });

        var formulasClear = document.querySelector('.workspace__clear');
        formulasClear.addEventListener('click', function (event) {
            event.preventDefault();
            var elementsInFormula = formula.getRenderedElements();
            formula.clearContainer();
            elementsInFormula.filter(function (item) {
                return item.classList.contains('element');
            }).forEach(function (item) {
                library.addElement(item);
            });
            if (!filter.isFilterInputClear()) {
                library.highlightElements();
            }
        });
    }

    /**
    * For MouseWheel -> DOMMouseScroll and for DragAndDrop. Triggered events in the following order:
    * in Chrome: mousedown -> mouseup (without click)
    * in Firefox: mousedown -> mouseup -> click
    * @returns {boolean}
    */
    function isFirefox() {
        return (/Firefox/i.test(navigator.userAgent)
        );
    }

    initEvents();
    var library = new Library();
    var formula = new Formula();
    var formulaRes = new FormulaResult();
    library.loadInfo('elements.json');
    formula.loadInfo('formulas.json');
    var filter = new Filter();
})();
//# sourceMappingURL=cauldron.js.map