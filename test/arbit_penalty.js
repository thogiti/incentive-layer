const IncentiveLayer = artifacts.require('./IncentiveLayer.sol')
const TRU = artifacts.require('./TRU.sol')
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"))

const timeout = require('./helpers/timeout')
const mineBlocks = require('./helpers/mineBlocks')

const BigNumber = require('bignumber.js')

contract('IncentiveLayer', function(accounts) {
  let incentiveLayer, deposit, bond, tx, log, taskID, intent, oldBalance, token

  const taskGiver = accounts[1]
  const solver = accounts[2]
  const verifier = accounts[3]
  const randomUser = accounts[4]

  const minDeposit = 50000
  const reward = web3.utils.toWei('1', 'ether')
  const randomBits = 12345

  context('incentive layer', () => {

    before(async () => {
      token = await TRU.new(); 
      incentiveLayer = await IncentiveLayer.new(token.address)
      oldBalance = await web3.eth.getBalance(solver)
    })

    it("should have participants make deposits", async () => {
      // taskGiver makes a deposit to fund taxes
      await incentiveLayer.makeDeposit({from: taskGiver, value: minDeposit})
      deposit = await incentiveLayer.getDeposit.call(taskGiver)
      assert(deposit.eq(minDeposit))

      // to-be solver makes a deposit
      await incentiveLayer.makeDeposit({from: solver, value: minDeposit})
      deposit = await incentiveLayer.getDeposit.call(solver)
      assert(deposit.eq(minDeposit))

      // to-be verifier makes a deposit
      await incentiveLayer.makeDeposit({from: verifier, value: minDeposit})
      deposit = await incentiveLayer.getDeposit.call(verifier)
      assert(deposit.eq(minDeposit))
    })

    it("should create task", async () => {
      // taskGiver creates a task.
      // they bond part of their deposit.
      tx = await incentiveLayer.createTask(minDeposit, 0x0, 5, {from: taskGiver, value: reward})

      log = tx.logs.find(log => log.event === 'DepositBonded')
      assert(log.args.taskID.eq(0))
      assert.equal(log.args.account, taskGiver)
      assert(log.args.amount.eq(minDeposit))

      log = tx.logs.find(log => log.event === 'TaskCreated')
      assert(log.args.taskID.isZero())
      assert(log.args.minDeposit.eq(minDeposit))
      assert(log.args.blockNumber.eq(5))
      assert(log.args.reward.eq(reward))

      taskID = log.args.taskID
    })

    it("should select a solver", async () => {
      // solver registers for the task.
      // they bond part of their deposit.
      tx = await incentiveLayer.registerForTask(taskID, web3.utils.soliditySha3(randomBits), {from: solver})

      log = tx.logs.find(log => log.event === 'DepositBonded')
      assert(log.args.taskID.eq(taskID))
      assert.equal(log.args.account, solver)
      assert(log.args.amount.eq(minDeposit))
      deposit = await incentiveLayer.getDeposit.call(solver)
      assert(deposit.eq(0))

      log = tx.logs.find(log => log.event === 'SolverSelected')
      assert(log.args.taskID.eq(taskID))
      assert.equal(log.args.solver, solver)
      assert.equal(log.args.taskData, 0x0)
      assert(log.args.minDeposit.eq(minDeposit))
      assert.equal(log.args.randomBitsHash, web3.utils.soliditySha3(randomBits))
    })

    it("solver penalized for revealling random bits", async () => {
        deposit = await incentiveLayer.getBondedDeposit.call(taskID, solver)
        assert(deposit.eq(minDeposit))       

        // random user submits random bits pre-image
        tx = await incentiveLayer.prematureReveal(taskID, randomBits, {from: randomUser})
        
        log = tx.logs.find(log => log.event == 'SolverDepositBurned')
        assert(log.args.taskID.eq(taskID))
        assert.equal(log.args.solver, solver)
        
        log = tx.logs.find(log => log.event == 'TaskCreated')
        assert(log.args.taskID.isZero())
        assert(log.args.minDeposit.eq(minDeposit))
        assert(log.args.blockNumber.eq(5))
        assert(log.args.reward.eq(reward))

        deposit = await incentiveLayer.getBondedDeposit.call(taskID, solver)
        assert(deposit.eq(0))
    })
  })
})