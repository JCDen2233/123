from flask import Flask, render_template
from flask_socketio import SocketIO
from server.events import init_socketio

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")


@app.route("/")
def index():
    return render_template("index.html")


if __name__ == "__main__":
    game_state = init_socketio(app, socketio)
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
