import * as ActionTypes from '../constants/ActionTypes';
const PlotMath = require('../data/PlotMath');
import { computePurchaseInfo } from '../data/ComputePurchaseInfo';
import * as Enums from '../constants/Enums';

import * as AccountActions from './AccountActions';

const Web3 = require('web3');
const hexy = require('hexy');
const PromisePool = require('es6-promise-pool');

export function addPlot(newPlot) {
  return {
    type: ActionTypes.ADD_PLOT,
    newPlot
  };
}

export function loadPlots() {
  return {
    type: ActionTypes.LOAD_PLOTS
  };
}

export function listPlot() {
  return {
    type: ActionTypes.LIST_PLOT
  };
}

export function plotListed(txHash, zoneIndex) {
  return {
    type: ActionTypes.PLOT_LISTED,
    txHash: txHash,
    zoneIndex: zoneIndex  
  };
}

export function doneLoadingPlots() {
  return {
    type: ActionTypes.LOAD_PLOTS_DONE
  };
}

function initializeContract(contractInfo) {
  const web3 = getWeb3(contractInfo);
  const contract = web3.eth.contract(contractInfo.abi);
  const contractInstance = contract.at(contractInfo.contractAddress);
  return contractInstance;
}

function getWeb3(contractInfo) {
  if (typeof window.web3 !== 'undefined') {
    return window.web3
  } else {
    throw 'no web3 provided';
  }
}

function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// This is gonna be a thunk action!
export function fetchPlotsFromWeb3(contractInfo) {
  return function (dispatch) {
    dispatch(loadPlots());

    // We need to get a handle to the actual instance of our running contract and figure out the current ownership info
    const contract = initializeContract(contractInfo);

    // First make a call to figure out the length of the ownership and data array to iterate through them
    return new Promise((resolve, reject) => {
      contract.ownershipLength.call((error, ownershipLengthString) => {
        if (error) reject(error);
        resolve(ownershipLengthString);
      });
    }).then((ownershipLengthString) => {
      const ownershipLength = parseInt(ownershipLengthString);
      let currentIndex = 0;

      const ownershipLoadFn = () => {
        if (currentIndex >= ownershipLength) {
          // We're done loading here
          return null;
        }

        return new Promise((resolve, reject) => {
          // Call get plot which returns an array type object which we can get properties from
          contract.getPlot.call(currentIndex, (error, plotInfo) => {
            if (error) reject(error);

            const plot = {
              rect: {
                x: parseInt(plotInfo['0']),
                y: parseInt(plotInfo['1']),
                w: parseInt(plotInfo['2']),
                h: parseInt(plotInfo['3'])
              },
              owner: plotInfo['4'],
              buyoutPrice: parseInt(plotInfo['5']),
              data: {
                url: plotInfo['6'],
                ipfsHash: plotInfo['7']
              },
              color: getRandomColor(),
              zoneIndex: currentIndex
            };

            plot.rect.x2 = plot.rect.x + plot.rect.w;
            plot.rect.y2 = plot.rect.y + plot.rect.h;

            dispatch(addPlot(plot)); 
            currentIndex++;

            resolve(plot);
          });
        });
      };

      // Create a pool.
      var pool = new PromisePool(ownershipLoadFn, 1);
      
      // Start the pool. 
      return pool.start().then(() => {
        dispatch(doneLoadingPlots());
      });
    });
  }
}

// thunk for updating price of plot
export function updateAuction(contractInfo, zoneIndex, newPrice) {
  return function(dispatch) {
    const web3 = getWeb3(contractInfo);

    return new Promise((resolve, reject) => {
      web3.eth.getCoinbase((error, coinbase) => {
        if (error) reject(error);  
        resolve(coinbase);
      });
    }).then((coinbase) => {
      const gasEstimate = 2000000;
      const contract = initializeContract(contractInfo);
    
      const param1 = zoneIndex;
      const param2 = newPrice;

      const txObject = {
        from: coinbase,
        gasPrice: '3000000000',
        gas: gasEstimate * 2
      }
      
      return new Promise((resolve, reject) => {
        contract.updateAuction.sendTransaction(param1, param2, txObject, (error, transactionReceipt) => {
          if (error) reject(error);
          dispatch(AccountActions.addPendingTransaction(transactionReceipt, Enums.TxType.AUCTION));     
          resolve(transactionReceipt);
        });
      });
    });
  }
}

// Converts a rect into the format that our contract is expecting
function buildArrayFromRectangles(rects) { 
  let result = [];
  for(const rect of rects) {
    result.push(rect.x);
    result.push(rect.y);
    result.push(rect.w);
    result.push(rect.h);
  }

  return result;
}

// This is the actual purchase function which will be a thunk
export function purchasePlot(contractInfo, plots, rectToPurchase, url, ipfsHash, changePurchaseStep) {
  return function(dispatch) {
    const purchaseInfo = computePurchaseInfo(rectToPurchase, plots);

    const web3 = getWeb3(contractInfo);

    dispatch(changePurchaseStep(Enums.PurchaseStage.WAITING_FOR_UNLOCK));
    return new Promise((resolve, reject) => {
      web3.eth.getCoinbase((error, coinbase) => {
        if (error) reject(error);  
        dispatch(changePurchaseStep(Enums.PurchaseStage.SUBMITTING_TO_BLOCKCHAIN));
        resolve(coinbase);
      });
    }).then((coinbase) => {
      const contract = initializeContract(contractInfo);
  
      const param1 = buildArrayFromRectangles([rectToPurchase]);
      const param2 = buildArrayFromRectangles(purchaseInfo.chunksToPurchase);
      const param3 = purchaseInfo.chunksToPurchaseAreaIndices;
      const param4 = hexy.hexy(ipfsHash);
      const param5 = url;
      const param6 = 10;
  
      const gasEstimate = 2000000;
      const txObject = {
        from: coinbase,
        gasPrice: '3000000000',
        gas: gasEstimate * 2
      }

      return new Promise((resolve, reject) => {
        contract.purchaseAreaWithData.sendTransaction(
          param1, param2, param3, param4, param5, param6, txObject, (error, transactionReceipt) => {
            if (error) reject(error);

            //dispatch(addPendingTransaction(transactionReceipt, Enums.TxType.PURCHASE));
            dispatch(changePurchaseStep(Enums.PurchaseStage.WAITING_FOR_CONFIRMATIONS));
            // We need to update the ownership and data arrays with the newly purchased plot
            const ownershipInfo = Object.assign({}, rectToPurchase);

            // TODO - Lots of stuff
            resolve(transactionReceipt);
        });
      });
    });
  };
}
