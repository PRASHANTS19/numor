const clientService = require('./client.service');
const { sendResponse } = require('../../utils/response');

exports.createClient = async function (req, res, next) {
    try{
        const user = req.user; // from auth middleware
        const data = req.body;

        const client = await clientService.createClient(user, data);

        return sendResponse(res, 201, { data: client });
    }
    catch(err){
        next(err);
    }

}

exports.listClients = async function (req, res, next) {
    try{
        const user = req.user; //breakpoint here
        const {page = 1, limit = 10} = req.query;
        const clients = await clientService.listClient(user, Number(page), Number(limit));

        console.log('Clients fetched:', clients);
        console.log('user:', user);

        return sendResponse(res, 200, { data: clients });
    }
    catch(err){
        next(err);
    }

}

exports.getClient = async function (req, res, next) {
    try{
        const user = req.user; // from auth middleware
        const clientId = req.params.id; // from URL parameter

        const client = await clientService.getClientById(user, clientId);    
        return sendResponse(res, 200, { data: client });
    }
    catch(err){
        next(err);
    }
}

exports.updateClient = async (req, res, next) => {
  try {
    const result = await clientService.updateClient({
      user: req.user,
      clientId: req.params.clientId,
      data: req.body,
    });

    if (result.count === 0) {
      const error = new Error('Client not found or not authorized');
      error.statusCode = 404;
      throw error;
    }

    return sendResponse(res, 200, {
      message: 'Client updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteClient = async (req, res, next) => {
  try {
    const result = await clientService.deleteClient({
      user: req.user,
      clientId: req.params.clientId
    });

    if (result.count === 0) {
      const error = new Error('Client not found or not authorized');
      error.statusCode = 404;
      throw error;
    }

    return sendResponse(res, 200, {
      message: 'Client deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
