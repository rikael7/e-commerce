
// se o user estiver logado ele não deixa seguir
function authtrue(req, res, next) {

    if (req.session.userId) {
        return res.redirect("/");
    }

    next();
}

module.exports = authtrue;