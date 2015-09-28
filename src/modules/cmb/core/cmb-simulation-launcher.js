// This is a controller for an mdDialog,
// the variable `locals` is passed through from main-controller where this is used.
angular.module('kitware.cmb.core')
    .controller('CmbSimulationLauncher' ,['$scope', '$window', 'kw.Girder', '$mdDialog', 'locals',
        function($scope, $window, $girder, $mdDialog, locals) {
        $scope.data = angular.copy($window.WorkflowHelper[locals.collectionName]['default-simulation-cluster']);

        $scope.serverOptions = Object.keys(locals.availability).filter(
            function(el) {
                return locals.availability[el];
            }); // ideally ['EC2', 'Traditional']
        $scope.serverSelection = $scope.serverOptions[0];

        $scope.title = locals.title;
        $scope.machines = locals.machines;
        $scope.hasLauncher = locals.hasLauncher;

        if ($scope.serverOptions.indexOf('Traditional') >= 0) {
            $scope.clusterData = {};
            $girder.getClusterProfiles()
                .success(function(data){
                    $scope.clusters = data.filter(function(el){
                        return el.status === 'running';
                    });
                    $scope.clusterData.selectedCluster = $scope.clusters[0];
                });
        }

        $scope.updateCost = function() {
            var cost = 0,
                array = $scope.machines,
                count = array.length;

            while(count--) {
                if(array[count].id === $scope.data.type) {
                   cost = array[count].cost;

                   // Keep track of machine CPU + GPU
                   $scope.data.cores =  array[count].cpu;
                   $scope.data.gpu = array[count].gpu;
                }
            }

            cost *= Number($scope.data.size);
            $scope.data.cost = cost;
        };
        $scope.updateCost();

        $scope.floorSlots = function(val) {
            $scope.clusterData.numberOfSlots = Math.floor(val);
        };

        $scope.valid = function() {
            if ($scope.serverSelection === 'Traditional') {
                return $scope.clusterData.selectedCluster !== undefined &&
                    $scope.clusterData.hydraExecutablePath !== undefined;
            } else {
                return true; //aws is already filled out and valid
            }
        };

        $scope.ok = function() {
            if ($scope.serverSelection === 'Traditional') {
                $scope.data = {_id: $scope.clusterData.selectedCluster._id, type:'trad'};
                locals.taskName += '_trad';
            }

            var args = [
                locals.simulation,
                $scope.data,
                $girder.getTaskId(locals.collectionName, locals.taskName)
            ];

            if ($scope.serverSelection === 'Traditional') {
                args.push($scope.clusterData);
            }

            // Delegate the start class on the callback function
            $mdDialog.hide(args);
        };

        $scope.cancel = function() {
          $mdDialog.cancel();
        };
    }]);