use colored::*;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct TodoList {
    list: Vec<TodoItem>,
}

#[derive(Serialize, Deserialize, Debug)]
enum TodoItemState {
    NotFinished,
    Finished,
}

#[derive(Serialize, Deserialize, Debug)]
struct TodoItem {
    content: String,
    state: TodoItemState,
}

const FILE_PATH: &str = "./1.json";

fn transform_params_into_index_list(params: Vec<String>) -> Vec<i32> {
    params
        .iter()
        .map(|i| i.parse::<i32>().unwrap())
        .collect::<Vec<i32>>()
}

impl TodoList {
    pub fn new() -> Self {
        Self::load().unwrap()
    }

    pub fn load() -> std::io::Result<TodoList> {
        match std::fs::read_to_string(FILE_PATH) {
            Ok(content) => {
                if content.is_empty() {
                    Ok(TodoList { list: Vec::new() })
                } else {
                    Ok(serde_json::from_str(content.as_str().trim())?)
                }
            }
            Err(_) => {
                let new_todo_list = TodoList { list: Vec::new() };
                std::fs::write(FILE_PATH, serde_json::to_string(&new_todo_list).unwrap().as_str())?;
                Ok(new_todo_list)
            }
        }
    }

    pub fn list(&self) {
        if self.list.is_empty() {
            println!("Empty. There is no todo list.");
            return;
        }

        self.list.iter().enumerate().for_each(|(i, s)| {
            print!("{}. ", i + 1);
            match s.state {
                TodoItemState::Finished => print!("{}", s.content.strikethrough()),
                TodoItemState::NotFinished => print!("{}", s.content),
            }
            print!("\n");
        })
    }

    pub fn add(&mut self, items: &Vec<String>) {
        if items.is_empty() {
            return;
        }

        items.iter().for_each(|s| {
            self.list.push(TodoItem {
                content: s.to_string(),
                state: TodoItemState::NotFinished,
            });
        });

        self.save();
    }

    pub fn done(&mut self, params: Vec<String>) {
        transform_params_into_index_list(params)
            .iter()
            .for_each(|index| {
                let todo = self.list.iter_mut().nth((*index - 1) as usize).unwrap();

                todo.state = TodoItemState::Finished;
            });

        self.save();
    }

    pub fn remove(&mut self, params: Vec<String>) {
        let mut index_list = transform_params_into_index_list(params);
        index_list.sort();
        index_list.iter().rev().for_each(|index| {
            self.list.remove((*index - 1) as usize);
        });
        self.save();
    }

    fn save(&mut self) {
        std::fs::write(FILE_PATH, serde_json::to_string(self).unwrap().as_str())
            .expect("Write file failed!");
    }
}

pub struct Todo {}
