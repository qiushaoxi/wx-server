var app = angular.module('myApp', []);
var tokenList = [ "YOYO"];
var socket = io.connect('http://localhost:5000');

app.controller('BitCNY-QC', function ($scope, $http) {
    $scope.makeTime = function (timestamp) {
        return moment(timestamp).format("HH:mm:ss");
    }

    socket.on('QC', function (data) {
        $scope.pairs = data;
    });
});

app.controller('BTS', function ($scope, $http) {
    $scope.makeTime = function (timestamp) {
        return moment(timestamp).format("HH:mm:ss");
    }

    socket.on('BTS', function (data) {
        $scope.pairs = data;
    });
});

app.controller('ETH', function ($scope, $http) {
    $scope.makeTime = function (timestamp) {
        return moment(timestamp).format("HH:mm:ss");
    }

    socket.on('ETH', function (data) {
        $scope.pairs = data;
    });

    socket.on('margin-ETH', function (data) {
        $scope.margins = data;
    });
});

app.controller('EOS', function ($scope, $http) {
    $scope.makeTime = function (timestamp) {
        return moment(timestamp).format("HH:mm:ss");
    }

    socket.on('EOS', function (data) {
        $scope.pairs = data;
    });
});

app.controller('NEO', function ($scope, $http) {
    $scope.makeTime = function (timestamp) {
        return moment(timestamp).format("HH:mm:ss");
    }

    socket.on('NEO', function (data) {
        $scope.pairs = data;
    });
});

app.controller('GXS', function ($scope, $http) {
    $scope.makeTime = function (timestamp) {
        return moment(timestamp).format("HH:mm:ss");
    }

    socket.on('GXS', function (data) {
        $scope.pairs = data;
    });
});

app.controller('YOYO', function ($scope, $http) {
    $scope.makeTime = function (timestamp) {
        return moment(timestamp).format("HH:mm:ss");
    }
    $scope.margins = [];


    socket.on('YOYO', function (data) {
        $scope.pairs = data;
    });
});


for (let i = 0; i < tokenList.length; i++) {
    let token = tokenList[i];
    let watchUrl = '/watch/' + token;
    let marginUrl = '/margin/' + token;
    app.controller(token, function ($scope, $http) {
        $scope.pairs = [];
        $scope.margins = [];
        $scope.makeTime = function (timestamp) {
            return moment(timestamp).format("HH:mm:ss");
        }
        setInterval(() => {

            $scope.time = moment().format("HH:mm:ss");         
            //拿价格
            $http({
                method: 'GET',
                url: watchUrl
            }).then(function successCallback(response) {
                $scope.pairs = response.data;
            }, function errorCallback(response) {
                // 请求失败执行代码
            });

            //拿差价
            $http({
                method: 'GET',
                url: marginUrl
            }).then(function successCallback(response) {
                $scope.margins = response.data;
            }, function errorCallback(response) {
                // 请求失败执行代码
            }); 

        }, 1000);
    });
}