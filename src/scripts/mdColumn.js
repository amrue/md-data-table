'use strict';

angular.module('md.data.table').directive('mdColumn', mdColumn);

function mdColumn($compile, $mdUtil) {

  function compile(tElement) {
    tElement.addClass('md-column');
    return postLink;
  }

  function postLink(scope, element, attrs, ctrls) {
    var headCtrl = ctrls.shift();
    var tableCtrl = ctrls.shift();
    var sortIcon;

    // drag resize vars
    var style = window.getComputedStyle(element[0], null),
        w,
        h,
        start,
        dragDir,
        axis;

    var dragging = function(e) {
        var prop, offset = start - e.clientX;
        prop = scope.rFlex ? flexBasis : 'width';
        element[0].style[prop] = w - offset + 'px';
    };

    var dragEnd = function(e) {
        scope.$apply();
        document.removeEventListener('mouseup', dragEnd, false);
        document.removeEventListener('mousemove', dragging, false);
        element.removeClass('no-transition');
    };

    var dragStart = function(e, direction) {
        dragDir = direction;
        axis = dragDir === 'left' || dragDir === 'right' ? 'x' : 'y';
        start = axis === 'x' ? e.clientX : e.clientY;
        w = parseInt(style.getPropertyValue('width'));
        h = parseInt(style.getPropertyValue('height'));

        //prevent transition while dragging
        element.addClass('no-transition');

        document.addEventListener('mouseup', dragEnd, false);
        document.addEventListener('mousemove', dragging, false);

        // Disable highlighting while dragging
        if(e.stopPropagation) e.stopPropagation();
        if(e.preventDefault) e.preventDefault();
        e.cancelBubble = true;
        e.returnValue = false;

        scope.$apply();
    };

    function enableResizeOnElement(element, direction) {
        element.ondragstart = function() { return false; };
        element.addEventListener('mousedown', function(e) {
            var disabled = (scope.rDisabled === 'true');
            if (!disabled && e.which === 1) {
                // left mouse click
                dragStart(e, direction);
            }
        }, false);
    }

    function attachDragHandle() {
      var dragHandle = angular.element("<div class='md-drag-handle'>");

      $compile(dragHandle)(scope);

      if(!element.hasClass('md-numeric')) {
        element.append(dragHandle);
        enableResizeOnElement(element[0], 'right')
      }
    }

    function attachSortIcon() {
      sortIcon = angular.element('<md-icon md-svg-icon="arrow-up.svg">');

      $compile(sortIcon.addClass('md-sort-icon').attr('ng-class','getDirection()'))(scope);

      if(element.hasClass('md-numeric')) {
        element.prepend(sortIcon);
      } else {
        element.append(sortIcon);
      }
    }

    function detachSortIcon() {
      Array.prototype.some.call(element.find('md-icon'), function (icon) {
        return icon.classList.contains('md-sort-icon') && element[0].removeChild(icon);
      });
    }

    function disableSorting() {
      detachSortIcon();
      sortIcon.removeClass('md-sort').off('click', setOrder);
    }

    function enableSorting() {
      attachSortIcon();
      sortIcon.addClass('md-sort').on('click', setOrder);
    }

    function enableDragResize() {
      attachDragHandle();
    }

    function getIndex() {
      return Array.prototype.indexOf.call(element.parent().children(), element[0]);
    }

    function isActive() {
      return scope.orderBy && (headCtrl.order === scope.orderBy || headCtrl.order === '-' + scope.orderBy);
    }

    function isNumeric() {
      return attrs.mdNumeric === '' || scope.numeric;
    }

    function isResize() {
      return attrs.mdResize === '' || scope.resize;
    }

    function setOrder() {
      scope.$applyAsync(function () {
        if(isActive()) {
          headCtrl.order = scope.getDirection() === 'md-asc' ? '-' + scope.orderBy : scope.orderBy;
        } else {
          headCtrl.order = scope.getDirection() === 'md-asc' ? scope.orderBy : '-' + scope.orderBy;
        }

        if(angular.isFunction(headCtrl.onReorder)) {
          $mdUtil.nextTick(function () {
            headCtrl.onReorder(headCtrl.order);
          });
        }
      });
    }

    function updateColumn(index, column) {
      tableCtrl.$$columns[index] = column;

      if(column.numeric) {
        element.addClass('md-numeric');
      } else {
        element.removeClass('md-numeric');
      }
    }

    scope.getDirection = function () {
      if(isActive()) {
        return headCtrl.order.charAt(0) === '-' ? 'md-desc' : 'md-asc';
      }

      return attrs.mdDesc === '' || scope.$eval(attrs.mdDesc) ? 'md-desc' : 'md-asc';
    };

    scope.$watch(isActive, function (active) {
      if(active) {
        element.addClass('md-active');
      } else {
        element.removeClass('md-active');
      }
    });

    scope.$watch(getIndex, function (index) {
      updateColumn(index, {'numeric': isNumeric()});
    });

    scope.$watch(isNumeric, function (numeric) {
      updateColumn(getIndex(), {'numeric': numeric});
    });

    scope.$watch(isResize, function (resize) {
      if(resize) {
          enableDragResize();
      }
    });

    scope.$watch('orderBy', function (orderBy) {
      if(orderBy) {
        if(!element.hasClass('md-sort')) {
          enableSorting();
        }
      } else if(element.hasClass('md-sort')) {
        disableSorting();
      }
    });
  }

  return {
    compile: compile,
    require: ['^^mdHead', '^^mdTable'],
    restrict: 'A',
    scope: {
      numeric: '=?mdNumeric',
      orderBy: '@?mdOrderBy',
      resize: '=?mdResize'
    }
  };
}

mdColumn.$inject = ['$compile', '$mdUtil'];
