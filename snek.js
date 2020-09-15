"use strict";

// https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API

const canvas = document.getElementById('thingie');
/** @type CanvasRenderingContext2D */
const ctx = canvas.getContext('2d');

function lolrand(max) {
    return Math.floor(Math.random() * max);
}


const configuration = {
    canvas_width: 600,
    canvas_height: 600,
    grid_size: 60,
    grid_x: 0,
    grid_y: 0,
    background_color: '#abcdef',
    food_color: '#903060',
    grid_line_color: 'hsl(210, 75%, 79%)', // #abcdef plus 7% sas, minus 1% lum
    snake_color: 'hsl(30, 14%, 44%)', // #807060
    snake_hsl_body_start: 40,
    snake_hsl_body_end: 0,
    movement_speed: 500,
    growth_per_food: 2,
};
configuration.grid_x = Math.floor(configuration.canvas_width / configuration.grid_size);
configuration.grid_y = Math.floor(configuration.canvas_height / configuration.grid_size);

const game_state = {
    grid: [],
    head_coords: [0, 0],
    food_coords: [1, 1],
    snake_coords: [ /* [y, x], [y, x], ... */ ],
    grow_skip: 0,
    move_food: false,
    current_direction: 'ArrowRight',
    next_direction: 'ArrowRight',
    game_running: true,
}

class Snek {

    constructor() {
        this.start_time = 0;
        this.last_time = 0;
        this.call_count = 0;
        this.last_draw = 0;
    }

    drawOntoCanvas() {
        // The snake has moved.  Let's clear out the grid and re-mark the current
        // snake positioning.  This could be done with more elegance instead of
        // just dumb brute force, but keeping it dumb part of the purpose.
        for (let y = 0; y < configuration.grid_y; y++) {
            for (let x = 0; x < configuration.grid_x; x++) {
                game_state.grid[y][x] = 0;
            }
        }

        for (const snake_coord of game_state.snake_coords) {
            game_state.grid[ snake_coord[0] ][ snake_coord[1] ] = 1;
        }

        if (game_state.move_food) {
            let new_food_x = lolrand(configuration.grid_x);
            let new_food_y = lolrand(configuration.grid_y);
            while (game_state.grid[ new_food_y ][ new_food_x ] != 0) {
                new_food_x = lolrand(configuration.grid_x);
                new_food_y = lolrand(configuration.grid_y);
            }
            game_state.food_coords[0] = new_food_y;
            game_state.food_coords[1] = new_food_x;
            game_state.move_food = false;
        }

        game_state.grid[ game_state.food_coords[0] ][ game_state.food_coords[1] ] = 2;

        // Brute force redraw the background and food
        for (let y = 0; y < configuration.grid_y; y++) {
            for (let x = 0; x < configuration.grid_x; x++) {
                if(game_state.grid[y][x] == 0) {
                    ctx.fillStyle = configuration.background_color;
                } else if(game_state.grid[y][x] == 2) {
                    ctx.fillStyle = configuration.food_color;
                }
                ctx.fillRect((x * configuration.grid_size) + 1, (y * configuration.grid_size) + 1, configuration.grid_size - 2, configuration.grid_size - 2);
            }
        }

        // But make the snake pretty.  The use of hsl() in the color lets us just
        // simply darken the original color to create a gradient.
        let lum_change = Math.max(configuration.snake_hsl_body_start, configuration.snake_hsl_body_end) - Math.min(configuration.snake_hsl_body_start, configuration.snake_hsl_body_end);
        let lum_change_per_unit = lum_change / game_state.snake_coords.length;
        let lum = configuration.snake_hsl_body_end;
        for (const snake_coord of game_state.snake_coords) {
            ctx.fillStyle = `hsl(30, 14%, ${lum}%)`;
            lum += lum_change_per_unit;

            ctx.fillRect((snake_coord[1] * configuration.grid_size) + 1, (snake_coord[0] * configuration.grid_size) + 1, configuration.grid_size - 2, configuration.grid_size - 2);
        }
        // The head always gets the base color.
        ctx.fillStyle = configuration.snake_color;
        ctx.fillRect((game_state.head_coords[1] * configuration.grid_size) + 1, (game_state.head_coords[0] * configuration.grid_size) + 1, configuration.grid_size - 2, configuration.grid_size - 2);
    }

    drawFirstCanvas() {
        // Create an empty grid
        let empty_x_list = [];
        for (let x = 0; x < configuration.grid_x; x++) {
            empty_x_list.push(0);
        }
        for (let y = 0; y < configuration.grid_y; y++) {
            game_state.grid.push(empty_x_list.slice());
        }

        // Place the head in the top half of the grid
        game_state.head_coords[0] = lolrand(Math.floor(configuration.grid_y / 2));
        game_state.head_coords[1] = lolrand(configuration.grid_x);
        game_state.grid[ game_state.head_coords[0] ][ game_state.head_coords[1] ] = 1;
        game_state.snake_coords.push(game_state.head_coords.slice());
        // and the food in the bottom half
        game_state.food_coords[0] = Math.floor(configuration.grid_y / 2) + lolrand(Math.floor(configuration.grid_y / 2));
        game_state.food_coords[1] = lolrand(configuration.grid_x);
        game_state.grid[ game_state.food_coords[0] ][ game_state.food_coords[1] ] = 2;

        // On each frame, we'll be coloring the squares created by these lines, but
        // not touching the lines themselves.  That means we can get away with only
        // drawing them once.
        for (let x = 0; x <= configuration.grid_x; x++) {
            ctx.beginPath();
            ctx.moveTo(x * configuration.grid_size, 0);
            ctx.lineTo(x * configuration.grid_size, configuration.canvas_width);
            ctx.lineWidth = 2;
            ctx.strokeStyle = configuration.grid_line_color;
            ctx.stroke();
            ctx.closePath();
        }

        for (let y = 0; y <= configuration.grid_y; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * configuration.grid_size);
            ctx.lineTo(configuration.canvas_width, y * configuration.grid_size);
            ctx.lineWidth = 2;
            ctx.strokeStyle = configuration.grid_line_color;
            ctx.stroke();
            ctx.closePath();
        }
    }

    directionChangeEventHandler(event) {
        if ((event.key == 'ArrowDown' && game_state.current_direction != 'ArrowUp')
            || (event.key == 'ArrowUp' && game_state.current_direction != 'ArrowDown')
            || (event.key == 'ArrowLeft' && game_state.current_direction != 'ArrowRight')
            || (event.key == 'ArrowRight' && game_state.current_direction != 'ArrowLeft')
        ) {
            game_state.next_direction = event.key;
        }
    }

    updateGameState(timestamp) {
        if (this.start_time == 0) {
            this.start_time = timestamp;
        }
        this.call_count++;

        if ( Math.floor(timestamp / 1000) > Math.floor(this.last_time / 1000) ) {
            document.getElementById('perf').textContent = this.call_count / (timestamp / 1000);
            document.getElementById('running').textContent = "running";
        }
        this.last_time = timestamp;

        if (timestamp > (this.last_draw + configuration.movement_speed)) {
            this.last_draw = timestamp;
            game_state.current_direction = game_state.next_direction;
            document.getElementById('direction').textContent = game_state.current_direction;

            if (game_state.current_direction == 'ArrowDown') {
                this.moveHead(0, 1);
            } else if (game_state.current_direction == 'ArrowUp') {
                this.moveHead(0, -1);
            } else if (game_state.current_direction == 'ArrowLeft') {
                this.moveHead(-1, 0);
            } else if (game_state.current_direction == 'ArrowRight') {
                this.moveHead(1, 0);
            }
        }

        // The game ends if we've hit ourself.
        if (!game_state.game_running) {
            document.getElementById('running').textContent = "stopped"
        }
    }

    moveHead(x, y) {
        game_state.grid[ game_state.head_coords[0] ][ game_state.head_coords[1] ] = 0;

        game_state.head_coords[0] += y;
        if (game_state.head_coords[0] >= configuration.grid_y) {
            game_state.head_coords[0] = 0;
        }
        if (game_state.head_coords[0] < 0) {
            game_state.head_coords[0] = configuration.grid_y - 1;
        }

        game_state.head_coords[1] += x;
        if (game_state.head_coords[1] >= configuration.grid_x) {
            game_state.head_coords[1] = 0;
        }
        if (game_state.head_coords[1] < 0) {
            game_state.head_coords[1] = configuration.grid_x - 1;
        }

        // Did we collide with ourself?
        if (game_state.grid[ game_state.head_coords[0] ][ game_state.head_coords[1] ] == 1) {
            game_state.game_running = false;
        }

        // The snake found the food => grow
        if (game_state.grid[ game_state.head_coords[0] ][ game_state.head_coords[1] ] == 2) {
            game_state.grow_skip += configuration.growth_per_food;
            game_state.move_food = true;
        }

        if (game_state.grow_skip > 0) {
            game_state.grow_skip--;
        } else {
            game_state.snake_coords.shift();
        }

        game_state.grid[ game_state.head_coords[0] ][ game_state.head_coords[1] ] = 1;
        game_state.snake_coords.push(game_state.head_coords.slice());

        document.getElementById('sneklen').textContent = game_state.snake_coords.length;
    }

    runGameLoop(timestamp) {
        this.updateGameState(timestamp);
        this.drawOntoCanvas(timestamp);
        if (game_state.game_running) {
            window.requestAnimationFrame(this.runGameLoop.bind(this));
        }
    }
};



var snek_game = new Snek();

snek_game.drawFirstCanvas();
window.addEventListener('keydown', snek_game.directionChangeEventHandler.bind(snek_game));
window.requestAnimationFrame(snek_game.runGameLoop.bind(snek_game));
