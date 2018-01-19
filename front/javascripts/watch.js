var app = angular.module('myApp', []);
var tokenList = ["BTS", "ETH", "EOS", "LTC", "NEO", "XRP", "BTC"];

app.controller('BitCNY-QC', function ($scope, $http) {
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
            url: '/watch/QC'
        }).then(function successCallback(response) {
            $scope.pairs = response.data;
            //$scope.pair = response.data;
        }, function errorCallback(response) {
            // 请求失败执行代码
        });

    }, 1000);
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